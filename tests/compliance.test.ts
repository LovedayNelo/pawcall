import { describe, it, expect } from "vitest";
import {
  resolvePolicies,
  requiresVCPR,
  canPrescribeRemotely,
  canDiagnoseRemotely,
  recordingConsentMode,
  evaluateCompliance,
} from "@/domain/compliance/compliance";

describe("compliance rules engine — policy resolution", () => {
  it("applies global defaults for unknown jurisdictions", () => {
    const p = resolvePolicies({ countryCode: "XX" });
    expect(p["REMOTE_PRESCRIBING"]).toBe("PROHIBITED");
    expect(p["RECORDING_CONSENT"]).toBe("TWO_PARTY");
  });

  it("returns country defaults and lets region override them", () => {
    const us = resolvePolicies({ countryCode: "US" });
    expect(us["VCPR_REQUIREMENT"]).toBe("REQUIRED");
    expect(requiresVCPR({ countryCode: "US" })).toBe(true);

    // California overrides remote prescribing to PROHIBITED (stricter than US default)
    const ca = resolvePolicies({ countryCode: "US", regionCode: "CA" });
    expect(ca["REMOTE_PRESCRIBING"]).toBe("PROHIBITED");
    expect(ca["VCPR_REQUIREMENT"]).toBe("REQUIRED");
  });

  it("lets runtime overrides (e.g. DB) win over static defaults without a redeploy", () => {
    const override = {
      countryCode: "US",
      regionCode: "NY",
      policies: { REMOTE_PRESCRIBING: "PROHIBITED" as const },
    };
    const p = resolvePolicies({ countryCode: "US", regionCode: "NY" }, [override]);
    expect(p["REMOTE_PRESCRIBING"]).toBe("PROHIBITED");
  });
});

describe("compliance rules engine — remote prescribing", () => {
  it("blocks controlled substances remotely everywhere", () => {
    for (const j of [
      { countryCode: "US" },
      { countryCode: "GB" },
      { countryCode: "AU" },
    ]) {
      const d = canPrescribeRemotely(j, { controlled: true });
      expect(d.allowed).toBe(false);
      expect(d.controlledAllowed).toBe(false);
    }
  });

  it("requires a VCPR in the US before prescribing non-controlled medications", () => {
    const withoutVcpr = canPrescribeRemotely(
      { countryCode: "US", regionCode: "WA" },
      { hasVCPR: false, controlled: false },
    );
    expect(withoutVcpr.allowed).toBe(false);
    expect(withoutVcpr.requiresVCPR).toBe(true);

    const withVcpr = canPrescribeRemotely(
      { countryCode: "US", regionCode: "WA" },
      { hasVCPR: true, controlled: false },
    );
    expect(withVcpr.allowed).toBe(true);
  });

  it("is prohibited outright in US states flagged for it, even with VCPR", () => {
    const california = canPrescribeRemotely(
      { countryCode: "US", regionCode: "CA" },
      { hasVCPR: true, controlled: false },
    );
    expect(california.allowed).toBe(false);
    expect(california.reason).toContain("prohibited");
  });
});

describe("compliance rules engine — diagnosis + recording consent", () => {
  it("positions the platform as advice/triage by restricting remote diagnosis", () => {
    expect(canDiagnoseRemotely({ countryCode: "US" })).toBe(true); // RESTRICTED != PROHIBITED
  });

  it("returns two-party recording consent by default", () => {
    expect(recordingConsentMode({ countryCode: "US" })).toBe("TWO_PARTY");
  });

  it("evaluates a whole consult context at once", () => {
    const check = evaluateCompliance(
      { countryCode: "US", regionCode: "WA" },
      { hasVCPR: false, controlled: false },
    );
    expect(check.prescribing.allowed).toBe(false);
    expect(check.remoteDiagnosisAllowed).toBe(true);
    expect(check.adviceDisclaimerRequired).toBe(true);
    expect(check.recordingConsent).toBe("TWO_PARTY");
  });
});