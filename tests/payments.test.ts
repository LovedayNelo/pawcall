import { describe, it, expect } from "vitest";
import {
  computeSplit,
  InvalidSplitError,
  applyDiscount,
  evaluatePayoutEligibility,
  groupForScheduledPayout,
  computeRefundSplit,
  DEFAULT_PLATFORM_RATE_BPS,
} from "@/domain/payments/split";

describe("payment split — correctness & rounding", () => {
  it("splits a ₦50 consult at the default 20% rate: owner pays exactly 5000 kobo", () => {
    const s = computeSplit({ amountCents: 5000 });
    expect(s.platformFeeCents).toBe(1000); // 20%
    expect(s.vetEarnCents).toBe(4000);
    expect(s.platformFeeCents + s.vetEarnCents + s.providerChargeCents).toBe(
      s.amountCents,
    );
  });

  it("accounts for a flat provider processing charge", () => {
    const s = computeSplit({ amountCents: 5000, providerChargeCents: 30 });
    expect(s.platformFeeCents).toBe(1000);
    expect(s.vetEarnCents).toBe(3970);
  });

  it("honours a per-vet negotiated commission override", () => {
    const s = computeSplit({ amountCents: 5000, vetRateBps: 1000 }); // 10%
    expect(s.platformFeeCents).toBe(500);
    expect(s.vetEarnCents).toBe(4500);
  });

  it("keeps the split fully convertible back to the gross amount", () => {
    for (const amount of [1, 99, 100, 101, 4999, 5000, 999999]) {
      const s = computeSplit({ amountCents: amount });
      expect(s.platformFeeCents + s.vetEarnCents).toBe(amount);
    }
    const withFees = computeSplit({ amountCents: 5000, providerChargeCents: 30 });
    expect(
      withFees.platformFeeCents + withFees.vetEarnCents + withFees.providerChargeCents,
    ).toBe(5000);
  });

  it("rejects invalid inputs", () => {
    expect(() => computeSplit({ amountCents: 0 })).toThrow(InvalidSplitError);
    expect(() => computeSplit({ amountCents: -5 })).toThrow(InvalidSplitError);
    expect(() => computeSplit({ amountCents: 5000, providerChargeCents: 999999 })).toThrow(
      InvalidSplitError,
    );
    expect(() => computeSplit({ amountCents: 5000, platformRateBps: 11_000 })).toThrow(
      InvalidSplitError,
    );
  });
});

describe("payment split — discounting", () => {
  it("applies a flat promo discount and never below zero", () => {
    expect(applyDiscount(5000, { type: "FLAT", value: 1000 })).toEqual({
      finalAmountCents: 4000,
      discountCents: 1000,
    });
    expect(applyDiscount(500, { type: "FLAT", value: 10000 }).finalAmountCents).toBe(0);
  });

  it("applies a percentage discount with rounding", () => {
    expect(applyDiscount(5000, { type: "PERCENT", value: 20 })).toEqual({
      finalAmountCents: 4000,
      discountCents: 1000,
    });
  });

  it("rejects an invalid discount", () => {
    expect(() => applyDiscount(100, { type: "PERCENT", value: 120 })).toThrow(
      InvalidSplitError,
    );
    expect(() => applyDiscount(100, { type: "FLAT", value: -1 })).toThrow(
      InvalidSplitError,
    );
  });
});

describe("payment split — payouts", () => {
  it("blocks instant payout below the threshold", () => {
    const e = evaluatePayoutEligibility(5000, { instantThresholdCents: 10000 });
    expect(e.eligible).toBe(false);
    expect(e.mode).toBe("INSTANT");
  });

  it("allows instant payout above the threshold", () => {
    const e = evaluatePayoutEligibility(15_000, { instantThresholdCents: 10_000 });
    expect(e.eligible).toBe(true);
  });

  it("groups earnings by vet for scheduled payout", () => {
    const g = groupForScheduledPayout([
      { vetUserId: "v1", vetEarnCents: 4000 },
      { vetUserId: "v1", vetEarnCents: 4000 },
      { vetUserId: "v2", vetEarnCents: 7000 },
    ]);
    expect(g).toContainEqual({ vetUserId: "v1", totalCents: 8000, consultCount: 2 });
    expect(g).toContainEqual({ vetUserId: "v2", totalCents: 7000, consultCount: 1 });
  });
});

describe("payment split — refunds", () => {
  it("splits a refund across platform, vet and provider proportionally", () => {
    const split = computeSplit({ amountCents: 5000, providerChargeCents: 30 });
    const refund = computeRefundSplit(split, 50); // 50% refund
    expect(refund.ownerRefundCents).toBe(2500);
    expect(
      refund.platformRefundCents + refund.vetRefundCents + refund.providerRefundCents,
    ).toBe(2500);
  });

  it("rejects out-of-range refund percents", () => {
    const split = computeSplit({ amountCents: 5000 });
    expect(() => computeRefundSplit(split, -1)).toThrow(InvalidSplitError);
    expect(() => computeRefundSplit(split, 101)).toThrow(InvalidSplitError);
  });
});

it("exposes the default platform rate for reuse", () => {
  expect(DEFAULT_PLATFORM_RATE_BPS).toBe(2000);
});