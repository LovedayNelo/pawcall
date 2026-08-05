export type PetSpecies =
  | "DOG"
  | "CAT"
  | "BIRD"
  | "REPTILE"
  | "SMALL_MAMMAL"
  | "RABBIT"
  | "FERRET"
  | "AVIAN"
  | "EXOTIC"
  | "OTHER";

/**
 * Structured answers collected from the pre-consult intake form.
 * Field names are stable: the triage engine reads these and nothing else.
 */
export interface IntakeAnswers {
  symptomCategory?: string;
  primarySymptom?: string;
  onset?: "sudden" | "gradual" | "unknown";
  durationHours?: number | null;
  species?: PetSpecies;
  breed?: string;
  weightKg?: number | null;

  vomiting?: boolean;
  vomitingFrequencyPer24h?: number | null;
  nonProductiveRetching?: boolean;
  hasDiarrhea?: boolean;
  diarrheaWithBlood?: boolean;
  unableToKeepWaterDown?: boolean;
  abdomenDistended?: boolean;

  difficultyBreathing?: boolean;
  blueOrPaleGums?: boolean;

  collapsed?: boolean;
  unresponsive?: boolean;
  seizures?: boolean;
  bleeding?: boolean;
  bleedingUncontrollable?: boolean;
  hitByCar?: boolean;
  severeTrauma?: boolean;
  severePain?: boolean;

  toxinExposure?: boolean;
  toxinType?: string;

  strainingToUrinate?: boolean;
  unableToUrinate?: boolean;

  eyeInjury?: boolean;
  eyeBulgingOrPainful?: boolean;

  pregnantAndStraining?: boolean;
  unproductiveLabor?: boolean;

  puppyOrKittenUnder16Weeks?: boolean;
  seniorPet?: boolean;
  fever?: boolean;
  lethargy?: boolean;
  weakness?: boolean;
}

export type TriageSeverity = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export type TriageDisposition =
  | "PROCEED_ONLINE"
  | "ROUTINE_IN_PERSON"
  | "URGENT_IN_PERSON"
  | "EMERGENCY_INTERRUPT";

export interface TriageResult {
  severity: TriageSeverity;
  disposition: TriageDisposition;
  matchedRuleIds: string[];
  redFlagSymptoms: string[];
  recommendation: string;
}

/** The gate that decides whether a queued video call is still offered. */
export function dispositionAllowsOnlineBooking(
  disposition: TriageDisposition,
): boolean {
  return disposition === "PROCEED_ONLINE" || disposition === "ROUTINE_IN_PERSON";
}

export interface TriageRule {
  id: string;
  severity: TriageSeverity;
  redFlag: boolean;
  applies: (answers: IntakeAnswers) => boolean;
  recommendation: string;
}

const TRUE = (v: boolean | undefined) => v === true;

/**
 * Rule set. Kept as pure data (declarative predicates) so symptoms can be
 * added/removed without touching control flow. Rules with `redFlag: true`
 * short-circuit the normal booking path when matched.
 */
export const TRIAGE_RULES: TriageRule[] = [
  {
    id: "resp.difficulty",
    severity: "CRITICAL",
    redFlag: true,
    applies: (a) => TRUE(a.difficultyBreathing),
    recommendation:
      "Difficulty breathing can be life-threatening. This needs emergency veterinary care immediately.",
  },
  {
    id: "resp.blueGums",
    severity: "CRITICAL",
    redFlag: true,
    applies: (a) => TRUE(a.blueOrPaleGums),
    recommendation:
      "Blue or pale gums indicate poor oxygenation. This is an emergency — go to the nearest 24/7 clinic now.",
  },
  {
    id: "collapse.unresponsive",
    severity: "CRITICAL",
    redFlag: true,
    applies: (a) => TRUE(a.collapsed) || TRUE(a.unresponsive),
    recommendation:
      "Collapse or unresponsiveness is an emergency. Seek immediate in-person care.",
  },
  {
    id: "neuro.seizures",
    severity: "CRITICAL",
    redFlag: true,
    applies: (a) => TRUE(a.seizures),
    recommendation:
      "Active or repeated seizures are an emergency. Call your closest emergency clinic on the way.",
  },
  {
    id: "bleed.uncontrollable",
    severity: "CRITICAL",
    redFlag: true,
    applies: (a) => TRUE(a.bleedingUncontrollable),
    recommendation:
      "Uncontrollable bleeding is life-threatening. Apply pressure and go to an emergency clinic now.",
  },
  {
    id: "trauma.hitByCar",
    severity: "CRITICAL",
    redFlag: true,
    applies: (a) => TRUE(a.hitByCar) || TRUE(a.severeTrauma),
    recommendation:
      "Recent trauma (e.g., hit by car) can hide internal injury. This is an emergency.",
  },
  {
    id: "toxin.ingestion",
    severity: "CRITICAL",
    redFlag: true,
    applies: (a) => TRUE(a.toxinExposure),
    recommendation:
      "Possible toxin exposure (e.g., chocolate, xylitol, grapes, rat poison, human medication) is an emergency. Do NOT induce vomiting without instruction.",
  },
  {
    id: "urinary.unableToUrinate",
    severity: "CRITICAL",
    redFlag: true,
    applies: (a) => TRUE(a.unableToUrinate),
    recommendation:
      "Inability to urinate (especially in male cats) is an emergency bladder obstruction.",
  },
  {
    id: "gi.bloat",
    severity: "CRITICAL",
    redFlag: true,
    applies: (a) =>
      TRUE(a.abdomenDistended) &&
      (TRUE(a.nonProductiveRetching) || TRUE(a.vomiting)) &&
      a.species === "DOG" &&
      isLargeBreedDog(a.breed),
    recommendation:
      "A distended abdomen with non-productive retching in a large-breed dog is a sign of GDV (bloat) — an emergency.",
  },
  {
    id: "gi.abdominalEmergency",
    severity: "HIGH",
    redFlag: true,
    applies: (a) =>
      TRUE(a.abdomenDistended) &&
      (TRUE(a.nonProductiveRetching) || TRUE(a.vomiting)) &&
      a.species !== "DOG",
    recommendation:
      "A tense, swollen abdomen with retching/vomiting requires urgent in-person assessment.",
  },
  {
    id: "repro.dystocia",
    severity: "HIGH",
    redFlag: true,
    applies: (a) => TRUE(a.pregnantAndStraining) && TRUE(a.unproductiveLabor),
    recommendation:
      "Straining without producing a puppy/kitten (dystocia) needs urgent veterinary care.",
  },
  {
    id: "ophth.eyeEmergency",
    severity: "HIGH",
    redFlag: true,
    applies: (a) => TRUE(a.eyeBulgingOrPainful) || TRUE(a.eyeInjury),
    recommendation:
      "Eye injuries and painful/bulging eyes are urgent — sight may be at risk within hours.",
  },
  {
    id: "gi.vomitBloodDiarrhea",
    severity: "HIGH",
    redFlag: true,
    applies: (a) => TRUE(a.diarrheaWithBlood) && TRUE(a.vomiting),
    recommendation:
      "Vomiting together with bloody diarrhea can indicate serious GI disease. Urgent in-person care advised.",
  },
  {
    id: "gi.unableToKeepWater",
    severity: "MODERATE",
    redFlag: false,
    applies: (a) => TRUE(a.vomiting) && TRUE(a.unableToKeepWaterDown),
    recommendation:
      "If your pet cannot keep water down they risk dehydration. A vet call today is wise.",
  },
  {
    id: "gi.vomitingModerate",
    severity: "MODERATE",
    redFlag: false,
    applies: (a) =>
      TRUE(a.vomiting) && (a.vomitingFrequencyPer24h ?? 0) >= 3,
    recommendation:
      "Frequent vomiting warrants a consult and possibly an in-person visit if it continues.",
  },
  {
    id: "urinary.straining",
    severity: "MODERATE",
    redFlag: false,
    applies: (a) => TRUE(a.strainingToUrinate),
    recommendation:
      "Straining to urinate can precede a blockage. Consult a vet today; seek emergency care if urine flow stops.",
  },
  {
    id: "systemic.lethargyFever",
    severity: "MODERATE",
    redFlag: false,
    applies: (a) => TRUE(a.lethargy) && TRUE(a.fever),
    recommendation:
      "Lethargy with a fever can signal infection. A consult is recommended and an in-person exam may be needed.",
  },
  {
    id: "age.youngSenior",
    severity: "MODERATE",
    redFlag: false,
    applies: (a) => TRUE(a.puppyOrKittenUnder16Weeks) || TRUE(a.seniorPet),
    recommendation:
      "Young or senior pets decompensate faster. Err toward an in-person visit for any symptom.",
  },
];

const LARGE_BREED_DOGS = new Set([
  "great dane",
  "german shepherd",
  "labrador",
  "golden retriever",
  "boxer",
  "rottweiler",
  "bernese",
  "st bernard",
  "doberman",
  "weimaraner",
  "dane",
  "newfoundland",
  "mastiff",
  "akita",
  "husky",
  "malamute",
]);

export function isLargeBreedDog(breed?: string): boolean {
  if (!breed) return true; // conservative: assume large-breed risk when breed unknown
  const b = breed.toLowerCase();
  return LARGE_BREED_DOGS.has(b) || b.includes("mix");
}

const SEVERITY_RANK: Record<TriageSeverity, number> = {
  LOW: 0,
  MODERATE: 1,
  HIGH: 2,
  CRITICAL: 3,
};

export function dispositionForSeverity(severity: TriageSeverity): TriageDisposition {
  switch (severity) {
    case "CRITICAL":
      return "EMERGENCY_INTERRUPT";
    case "HIGH":
      return "URGENT_IN_PERSON";
    case "MODERATE":
      return "ROUTINE_IN_PERSON";
    default:
      return "PROCEED_ONLINE";
  }
}

/**
 * Pure triage evaluation. Returns the highest-severity matched rule plus the
 * derived disposition. Matched red-flag rules MUST short-circuit the booking
 * path upstream (see API layer).
 */
export function evaluateTriage(
  answers: IntakeAnswers,
  rules: TriageRule[] = TRIAGE_RULES,
): TriageResult {
  const matched = rules.filter((r) => r.applies(answers));
  if (matched.length === 0) {
    return {
      severity: "LOW",
      disposition: "PROCEED_ONLINE",
      matchedRuleIds: [],
      redFlagSymptoms: [],
      recommendation:
        "No emergency red flags detected. You can proceed with a video consult for advice and triage.",
    };
  }

  matched.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  const top = matched[0];
  const redFlags = matched.filter((r) => r.redFlag).map((r) => r.id);

  return {
    severity: top.severity,
    disposition: dispositionForSeverity(top.severity),
    matchedRuleIds: matched.map((r) => r.id),
    redFlagSymptoms: redFlags,
    recommendation: top.recommendation,
  };
}
