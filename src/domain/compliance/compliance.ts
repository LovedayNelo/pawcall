/**
 * Data-driven jurisdiction/compliance rules engine for veterinary telehealth.
 *
 * The engine is deliberately pure: policies are plain data (defaults in
 * `defaultPolicies.ts`, plus optional runtime overrides, e.g. from the
 * `JurisdictionPolicy` table). Adding a jurisdiction or changing a rule is a
 * data change, not a redeploy of control flow.
 *
 * Every decision here is a legal/regulatory assumption that MUST be reviewed
 * by counsel for each target launch market before go-live.
 */

import { GLOBAL_DEFAULTS, DEFAULT_POLICIES } from "./defaultPolicies";
import type {
  Jurisdiction,
  JurisdictionPolicies,
  PolicyName,
  PolicyValue,
  RecordingConsentMode,
} from "./types";

export type {
  Jurisdiction,
  JurisdictionPolicies,
  PolicyName,
  PolicyValue,
  RecordingConsentMode,
};

/** Highest rule level wins, matching licensing law: the pet's location governs. */
export function resolvePolicies(
  jurisdiction: Jurisdiction,
  overrides: JurisdictionPolicies[] = [],
): Record<PolicyName, PolicyValue> {
  const { countryCode, regionCode = null } = jurisdiction;
  const cc = countryCode.toUpperCase();

  const countryLevel = DEFAULT_POLICIES.find(
    (p) => p.countryCode === cc && p.regionCode === null,
  );
  const regionLevel = DEFAULT_POLICIES.find(
    (p) => p.countryCode === cc && p.regionCode === (regionCode ?? null),
  );
  const runtimeCountry = overrides.find(
    (p) => p.countryCode === cc && p.regionCode === null,
  );
  const runtimeRegion = overrides.find(
    (p) => p.countryCode === cc && p.regionCode === (regionCode ?? null),
  );

  const merged = {
    ...GLOBAL_DEFAULTS,
    ...(countryLevel?.policies ?? {}),
    ...(regionLevel?.policies ?? {}),
    ...(runtimeCountry?.policies ?? {}),
    ...(runtimeRegion?.policies ?? {}),
  } as Record<PolicyName, PolicyValue>;

  return merged;
}

/** True when a remote (video-only) consult may not legally stand in for a physical exam. */
export function requiresVCPR(
  jurisdiction: Jurisdiction,
  overrides: JurisdictionPolicies[] = [],
): boolean {
  const v = resolvePolicies(jurisdiction, overrides)["VCPR_REQUIREMENT"];
  return v === "REQUIRED";
}

export interface PrescribingDecision {
  allowed: boolean;
  reason: string;
  controlledAllowed: boolean;
  requiresVCPR: boolean;
  hasVCPR: boolean;
}

/**
 * Gate for any prescription-adjacent action. Controlled substances are
 * universally treated as prohibited via video in Phase 1.
 */
export function canPrescribeRemotely(
  jurisdiction: Jurisdiction,
  options: { hasVCPR?: boolean; controlled?: boolean } = {},
  overrides: JurisdictionPolicies[] = [],
): PrescribingDecision {
  const policies = resolvePolicies(jurisdiction, overrides);
  const hasVCPR = options.hasVCPR ?? false;
  const controlled = options.controlled ?? false;
  const vcpr = policies["VCPR_REQUIREMENT"];

  if (controlled) {
    return {
      allowed: false,
      controlledAllowed: false,
      requiresVCPR: true,
      hasVCPR,
      reason:
        "Remote prescribing of controlled substances is prohibited in this jurisdiction and across the platform.",
    };
  }

  const remoteRx = policies["REMOTE_PRESCRIBING"];
  const vcprRequired = vcpr === "REQUIRED";

  if (remoteRx === "PROHIBITED") {
    return {
      allowed: false,
      controlledAllowed: false,
      requiresVCPR: false,
      hasVCPR,
      reason: "Remote prescribing is prohibited in this jurisdiction.",
    };
  }

  if (remoteRx === "ALLOWED_WITH_VCPR" && !hasVCPR && vcprRequired) {
    return {
      allowed: false,
      controlledAllowed: false,
      requiresVCPR: true,
      hasVCPR,
      reason:
        "A valid Veterinarian-Client-Patient Relationship (VCPR) is required before prescribing. Establish care in person first.",
    };
  }

  return {
    allowed: true,
    controlledAllowed: false,
    requiresVCPR: vcprRequired,
    hasVCPR,
    reason: vcprRequired
      ? "Prescribing allowed only where a VCPR exists."
      : "Remote prescribing of non-controlled medications is permitted.",
  };
}

export function canDiagnoseRemotely(
  jurisdiction: Jurisdiction,
  overrides: JurisdictionPolicies[] = [],
): boolean {
  return resolvePolicies(jurisdiction, overrides)["REMOTE_DIAGNOSIS"] !== "PROHIBITED";
}

/** Two-party consent states require BOTH parties to consent before recording. */
export function recordingConsentMode(
  jurisdiction: Jurisdiction,
  overrides: JurisdictionPolicies[] = [],
): RecordingConsentMode {
  return resolvePolicies(jurisdiction, overrides)["RECORDING_CONSENT"] as RecordingConsentMode;
}

export interface ComplianceCheck {
  prescribing: PrescribingDecision;
  remoteDiagnosisAllowed: boolean;
  adviceDisclaimerRequired: boolean;
  recordingConsent: RecordingConsentMode;
}

/** One-shot evaluation for a consult in a given jurisdiction. */
export function evaluateCompliance(
  jurisdiction: Jurisdiction,
  options: { hasVCPR?: boolean; controlled?: boolean } = {},
  overrides: JurisdictionPolicies[] = [],
): ComplianceCheck {
  const policies = resolvePolicies(jurisdiction, overrides);
  return {
    prescribing: canPrescribeRemotely(jurisdiction, options, overrides),
    remoteDiagnosisAllowed: policies["REMOTE_DIAGNOSIS"] !== "PROHIBITED",
    adviceDisclaimerRequired:
      policies["TELEHEALTH_ADVICE_DISCLAIMER_REQUIRED"] !== false,
    recordingConsent: recordingConsentMode(jurisdiction, overrides),
  };
}
