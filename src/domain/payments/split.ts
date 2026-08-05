/**
 * Marketplace payment split + payout logic.
 *
 * All money is integer minor units (kobo). The split is deterministic and
 * rounding-safe: platform + provider fees are computed first and the vet earns
 * the remainder, so `vetEarnCents + platformFeeCents + providerChargeCents`
 * always equals `amountCents`.
 */

export interface SplitInput {
  amountCents: number;
  /** Platform commission in basis points (1% = 100). Overridable per vet. */
  platformRateBps?: number;
  /** Flat per-transaction payment processor cost, cents. */
  providerChargeCents?: number;
  /** Per-vet commission override in basis points (e.g. negotiated rates). */
  vetRateBps?: number | null;
}

export interface SplitResult {
  amountCents: number;
  platformFeeCents: number;
  providerChargeCents: number;
  vetEarnCents: number;
  platformRateBps: number;
}

export class InvalidSplitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSplitError";
  }
}

export const DEFAULT_PLATFORM_RATE_BPS = 2000; // 20%
export const MAX_SAFE_AMOUNT_CENTS = 10_000_000; // ₦100,000 per transaction

function roundCents(n: number): number {
  return Math.round(n);
}

/** Determine which commission rate applies: vet override wins, else global. */
export function effectiveRateBps(input: SplitInput): number {
  const override =
    input.vetRateBps !== undefined && input.vetRateBps !== null
      ? input.vetRateBps
      : null;
  const rate =
    override ?? input.platformRateBps ?? DEFAULT_PLATFORM_RATE_BPS;
  if (rate < 0 || rate > 10_000) {
    throw new InvalidSplitError(
      `Commission rate ${rate}bps is out of range (0-10000).`,
    );
  }
  return rate;
}

export function computeSplit(input: SplitInput): SplitResult {
  const { amountCents, providerChargeCents = 0 } = input;

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new InvalidSplitError(
      `amountCents must be a positive integer, got ${amountCents}.`,
    );
  }
  if (amountCents > MAX_SAFE_AMOUNT_CENTS) {
    throw new InvalidSplitError("amountCents exceeds the maximum supported.");
  }
  if (!Number.isInteger(providerChargeCents) || providerChargeCents < 0) {
    throw new InvalidSplitError("providerChargeCents must be a non-negative integer.");
  }

  const platformRateBps = effectiveRateBps(input);
  const platformFeeCents = roundCents((amountCents * platformRateBps) / 10_000);
  const vetEarnCents = amountCents - platformFeeCents - providerChargeCents;

  if (vetEarnCents < 0) {
    throw new InvalidSplitError(
      `Fees (${platformFeeCents} + ${providerChargeCents}) exceed the charge amount (${amountCents}).`,
    );
  }

  return {
    amountCents,
    platformFeeCents,
    providerChargeCents,
    vetEarnCents,
    platformRateBps,
  };
}

/** Owner-facing discounting (promo codes / first-consult credits). */
export function applyDiscount(
  amountCents: number,
  discount: { type: "PERCENT" | "FLAT"; value: number },
): { finalAmountCents: number; discountCents: number } {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new InvalidSplitError(`Invalid amount: ${amountCents}.`);
  }
  if (discount.value < 0) {
    throw new InvalidSplitError("Discount value cannot be negative.");
  }
  let discountCents: number;
  if (discount.type === "PERCENT") {
    if (discount.value > 100) {
      throw new InvalidSplitError("Percent discount cannot exceed 100.");
    }
    discountCents = roundCents((amountCents * discount.value) / 100);
  } else {
    discountCents = Math.min(amountCents, roundCents(discount.value));
  }
  return { finalAmountCents: amountCents - discountCents, discountCents };
}

export type PayoutMode = "INSTANT" | "SCHEDULED";

export interface PayoutEligibility {
  mode: PayoutMode;
  eligible: boolean;
  reason: string;
  vetEarnCents: number;
  instantThresholdCents: number;
}

/** Instant payouts are only offered once a vet's earnings clear a threshold. */
export function evaluatePayoutEligibility(
  vetEarnCents: number,
  options: { instantThresholdCents?: number; balanceCents?: number } = {},
): PayoutEligibility {
  const instantThresholdCents =
    options.instantThresholdCents ?? 42_000; // default ₦420
  const balanceCents = options.balanceCents ?? vetEarnCents;

  if (!Number.isInteger(vetEarnCents) || vetEarnCents < 0) {
    throw new InvalidSplitError(`Invalid vet earnings: ${vetEarnCents}.`);
  }

  if (balanceCents < instantThresholdCents) {
    return {
      mode: "INSTANT",
      eligible: false,
      reason: `Earnings are below the instant-payout minimum.`,
      vetEarnCents,
      instantThresholdCents,
    };
  }
  return {
    mode: "INSTANT",
    eligible: true,
    reason: "Earnings meet the instant-payout threshold.",
    vetEarnCents,
    instantThresholdCents,
  };
}

/** Aggregate completed consults into a schedulable payout batch. */
export function groupForScheduledPayout(
  earnings: Array<{ vetUserId: string; vetEarnCents: number }>,
): Array<{ vetUserId: string; totalCents: number; consultCount: number }> {
  const byVet = new Map<string, { totalCents: number; count: number }>();
  for (const e of earnings) {
    const cur = byVet.get(e.vetUserId) ?? { totalCents: 0, count: 0 };
    cur.totalCents += e.vetEarnCents;
    cur.count += 1;
    byVet.set(e.vetUserId, cur);
  }
  return Array.from(byVet.entries()).map(([vetUserId, v]) => ({
    vetUserId,
    totalCents: v.totalCents,
    consultCount: v.count,
  }));
}

/** Refund split: allocates who absorbs the refunded amount. */
export function computeRefundSplit(
  split: SplitResult,
  refundPercent: number,
): {
  ownerRefundCents: number;
  platformRefundCents: number;
  vetRefundCents: number;
  providerRefundCents: number;
} {
  if (refundPercent < 0 || refundPercent > 100) {
    throw new InvalidSplitError("refundPercent must be 0-100.");
  }
  const p = refundPercent / 100;
  return {
    ownerRefundCents: roundCents(split.amountCents * p),
    platformRefundCents: roundCents(split.platformFeeCents * p),
    vetRefundCents: roundCents(split.vetEarnCents * p),
    providerRefundCents: roundCents(split.providerChargeCents * p),
  };
}
