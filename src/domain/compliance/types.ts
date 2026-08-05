export type PolicyName =
  | "VCPR_REQUIREMENT" // REQUIRED | NOT_REQUIRED | UNKNOWN
  | "REMOTE_DIAGNOSIS" // ALLOWED | RESTRICTED | PROHIBITED
  | "REMOTE_PRESCRIBING" // ALLOWED_NON_CONTROLLED | ALLOWED_WITH_VCPR | PROHIBITED
  | "CONTROLLED_SUBSTANCES_REMOTE" // PROHIBITED (universal)
  | "TELEHEALTH_ADVICE_DISCLAIMER_REQUIRED" // true | false
  | "RECORDING_CONSENT"; // ONE_PARTY | TWO_PARTY

export type PolicyValue = string | boolean;

export interface JurisdictionPolicies {
  countryCode: string;
  regionCode: string | null;
  policies: Partial<Record<PolicyName, PolicyValue>>;
}

export interface Jurisdiction {
  countryCode: string;
  regionCode?: string | null;
}

export type RecordingConsentMode = "ONE_PARTY" | "TWO_PARTY";