import { describe, it, expect } from "vitest";
import {
  evaluateTriage,
  dispositionAllowsOnlineBooking,
  type IntakeAnswers,
} from "@/domain/triage/triage";

const base: IntakeAnswers = { species: "DOG", onset: "gradual" };

describe("triage engine — emergency interrupt", () => {
  it("flags difficulty breathing as CRITICAL / EMERGENCY_INTERRUPT", () => {
    const r = evaluateTriage({ ...base, symptomCategory: "RESPIRATORY", difficultyBreathing: true });
    expect(r.severity).toBe("CRITICAL");
    expect(r.disposition).toBe("EMERGENCY_INTERRUPT");
    expect(r.matchedRuleIds).toContain("resp.difficulty");
    expect(r.redFlagSymptoms).toContain("resp.difficulty");
    expect(dispositionAllowsOnlineBooking(r.disposition)).toBe(false);
  });

  it("flags blue/pale gums as an emergency", () => {
    const r = evaluateTriage({ ...base, blueOrPaleGums: true });
    expect(r.disposition).toBe("EMERGENCY_INTERRUPT");
  });

  it("flags collapse/unresponsiveness and seizures as emergencies", () => {
    expect(evaluateTriage({ ...base, collapsed: true }).disposition).toBe("EMERGENCY_INTERRUPT");
    expect(evaluateTriage({ ...base, unresponsive: true }).disposition).toBe("EMERGENCY_INTERRUPT");
    expect(evaluateTriage({ ...base, seizures: true }).disposition).toBe("EMERGENCY_INTERRUPT");
  });

  it("flags toxin exposure as an emergency", () => {
    const r = evaluateTriage({ ...base, toxinExposure: true, toxinType: "chocolate" });
    expect(r.severity).toBe("CRITICAL");
    expect(r.disposition).toBe("EMERGENCY_INTERRUPT");
  });

  it("flags inability to urinate (bladder obstruction) as emergency", () => {
    const r = evaluateTriage({ species: "CAT", unableToUrinate: true });
    expect(r.disposition).toBe("EMERGENCY_INTERRUPT");
  });

  it("detects GDV bloat only in large-breed dogs with retching + distended abdomen", () => {
    const critical = evaluateTriage({
      species: "DOG",
      breed: "great dane",
      abdomenDistended: true,
      nonProductiveRetching: true,
    });
    expect(critical.disposition).toBe("EMERGENCY_INTERRUPT");
    expect(critical.matchedRuleIds).toContain("gi.bloat");

    const notCatBloat = evaluateTriage({
      species: "CAT",
      abdomenDistended: true,
      nonProductiveRetching: true,
    });
    expect(notCatBloat.matchedRuleIds).not.toContain("gi.bloat");
    // still high urgency as non-dog abdominal emergency
    expect(notCatBloat.matchedRuleIds).toContain("gi.abdominalEmergency");
  });
});

describe("triage engine — high / urgent-in-person", () => {
  it("routes a painful/bulging eye to urgent in-person care", () => {
    const r = evaluateTriage({ ...base, eyeBulgingOrPainful: true });
    expect(r.disposition).toBe("URGENT_IN_PERSON");
    expect(dispositionAllowsOnlineBooking(r.disposition)).toBe(false);
  });

  it("routes vomiting + bloody diarrhea to urgent care", () => {
    const r = evaluateTriage({ ...base, vomiting: true, diarrheaWithBlood: true });
    expect(r.disposition).toBe("URGENT_IN_PERSON");
  });
});

describe("triage engine — moderate / routine-in-person", () => {
  it("routes frequent vomiting to routine in-person", () => {
    const r = evaluateTriage({ ...base, vomiting: true, vomitingFrequencyPer24h: 4 });
    expect(r.disposition).toBe("ROUTINE_IN_PERSON");
    // still allows an online consult as a first step
    expect(dispositionAllowsOnlineBooking(r.disposition)).toBe(true);
  });

  it("flags dehydration risk when unable to keep water down", () => {
    const r = evaluateTriage({ ...base, vomiting: true, unableToKeepWaterDown: true });
    expect(r.matchedRuleIds).toContain("gi.unableToKeepWater");
  });
});

describe("triage engine — low / proceed online", () => {
  it("allows online booking when no rules match", () => {
    const r = evaluateTriage({ ...base, symptomCategory: "DERMATOLOGICAL" });
    expect(r.severity).toBe("LOW");
    expect(r.disposition).toBe("PROCEED_ONLINE");
    expect(dispositionAllowsOnlineBooking(r.disposition)).toBe(true);
    expect(r.matchedRuleIds).toHaveLength(0);
  });

  it("escalates young/senior pets regardless of otherwise mild symptoms", () => {
    const r = evaluateTriage({ ...base, puppyOrKittenUnder16Weeks: true });
    expect(r.matchedRuleIds).toContain("age.youngSenior");
    expect(r.severity).not.toBe("LOW");
  });
});

describe("triage engine — highest severity wins", () => {
  it("returns the most severe of multiple matched rules", () => {
    const r = evaluateTriage({
      ...base,
      difficultyBreathing: true, // CRITICAL
      vomiting: true, // MODERATE
    });
    expect(r.severity).toBe("CRITICAL");
    expect(r.disposition).toBe("EMERGENCY_INTERRUPT");
  });
});