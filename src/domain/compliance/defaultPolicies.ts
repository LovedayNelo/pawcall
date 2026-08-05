import type {
  JurisdictionPolicies,
  PolicyValue,
  PolicyName,
} from "./types";

/**
 * Default policy dataset. Region-specific entries override country-level
 * entries. Everything here is a legal assumption that MUST be validated by
 * counsel per launch market.
 */

export const GLOBAL_DEFAULTS: Record<PolicyName, PolicyValue> = {
  VCPR_REQUIREMENT: "UNKNOWN",
  REMOTE_DIAGNOSIS: "RESTRICTED",
  REMOTE_PRESCRIBING: "PROHIBITED",
  CONTROLLED_SUBSTANCES_REMOTE: "PROHIBITED",
  TELEHEALTH_ADVICE_DISCLAIMER_REQUIRED: true,
  RECORDING_CONSENT: "TWO_PARTY",
};

export const DEFAULT_POLICIES: JurisdictionPolicies[] = [
  // -----------------------------------------------------------------------
  // United States — federal default (advice/triage only, no remote prescribing)
  // -----------------------------------------------------------------------
  {
    countryCode: "US",
    regionCode: null,
    policies: {
      VCPR_REQUIREMENT: "REQUIRED",
      REMOTE_DIAGNOSIS: "RESTRICTED",
      REMOTE_PRESCRIBING: "ALLOWED_WITH_VCPR",
      CONTROLLED_SUBSTANCES_REMOTE: "PROHIBITED",
      TELEHEALTH_ADVICE_DISCLAIMER_REQUIRED: true,
      RECORDING_CONSENT: "TWO_PARTY",
    },
  },
  // Several U.S. states (e.g. CA, TX, NC) restrict remote prescribing even
  // further and/or require a documented VCPR from an in-person exam. Example:
  {
    countryCode: "US",
    regionCode: "CA",
    policies: {
      REMOTE_DIAGNOSIS: "RESTRICTED",
      REMOTE_PRESCRIBING: "PROHIBITED",
    },
  },
  {
    countryCode: "US",
    regionCode: "TX",
    policies: {
      REMOTE_PRESCRIBING: "PROHIBITED",
    },
  },
  {
    countryCode: "US",
    regionCode: "NC",
    policies: {
      REMOTE_PRESCRIBING: "PROHIBITED",
    },
  },

  // -----------------------------------------------------------------------
  // Canada — provincial variation; QC/ON note
  // -----------------------------------------------------------------------
  {
    countryCode: "CA",
    regionCode: null,
    policies: {
      VCPR_REQUIREMENT: "REQUIRED",
      REMOTE_DIAGNOSIS: "RESTRICTED",
      REMOTE_PRESCRIBING: "ALLOWED_WITH_VCPR",
      CONTROLLED_SUBSTANCES_REMOTE: "PROHIBITED",
      TELEHEALTH_ADVICE_DISCLAIMER_REQUIRED: true,
      RECORDING_CONSENT: "TWO_PARTY",
    },
  },

  // -----------------------------------------------------------------------
  // United Kingdom — England/Scotland/Wales/NI: remote advice permitted,
  // prescribing gated on a valid VCPR.
  // -----------------------------------------------------------------------
  {
    countryCode: "GB",
    regionCode: null,
    policies: {
      VCPR_REQUIREMENT: "REQUIRED",
      REMOTE_DIAGNOSIS: "ALLOWED",
      REMOTE_PRESCRIBING: "ALLOWED_WITH_VCPR",
      CONTROLLED_SUBSTANCES_REMOTE: "PROHIBITED",
      TELEHEALTH_ADVICE_DISCLAIMER_REQUIRED: true,
      RECORDING_CONSENT: "TWO_PARTY",
    },
  },
  {
    countryCode: "GB",
    regionCode: "ENG",
    policies: {
      VCPR_REQUIREMENT: "REQUIRED",
      REMOTE_PRESCRIBING: "ALLOWED_WITH_VCPR",
    },
  },

  // -----------------------------------------------------------------------
  // Australia
  // -----------------------------------------------------------------------
  {
    countryCode: "AU",
    regionCode: null,
    policies: {
      VCPR_REQUIREMENT: "REQUIRED",
      REMOTE_DIAGNOSIS: "RESTRICTED",
      REMOTE_PRESCRIBING: "ALLOWED_WITH_VCPR",
      CONTROLLED_SUBSTANCES_REMOTE: "PROHIBITED",
      TELEHEALTH_ADVICE_DISCLAIMER_REQUIRED: true,
      RECORDING_CONSENT: "TWO_PARTY",
    },
  },

  // -----------------------------------------------------------------------
  // European Union default — GDPR-relevant; rules vary by member state.
  // -----------------------------------------------------------------------
  {
    countryCode: "EU",
    regionCode: null,
    policies: {
      VCPR_REQUIREMENT: "UNKNOWN",
      REMOTE_DIAGNOSIS: "ALLOWED",
      REMOTE_PRESCRIBING: "ALLOWED_WITH_VCPR",
      CONTROLLED_SUBSTANCES_REMOTE: "PROHIBITED",
      TELEHEALTH_ADVICE_DISCLAIMER_REQUIRED: true,
      RECORDING_CONSENT: "TWO_PARTY",
    },
  },
];
