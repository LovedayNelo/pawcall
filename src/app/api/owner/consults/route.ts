import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getTenantContext } from "@/lib/tenant/context";
import { evaluateTriage, dispositionAllowsOnlineBooking, type IntakeAnswers } from "@/domain/triage/triage";
import { evaluateCompliance } from "@/domain/compliance/compliance";
import { computeSplit, applyDiscount, DEFAULT_PLATFORM_RATE_BPS } from "@/domain/payments/split";

const CONSULT_PRICE_KOBOO = 9800;

async function getPrisma() {
  const { tenantPrisma } = await getTenantContext();
  if (!tenantPrisma) {
    throw new Error("No tenant context available");
  }
  return tenantPrisma;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { petId, type = "SCHEDULED", intakeAnswers, promoCode, vetId, waitEstimateMinutes } = body;

  const prisma = await getPrisma();
  // Verify pet belongs to owner
  const pet = await prisma.pet.findFirst({
    where: { id: petId, ownerId: session.userId, deletedAt: null },
    include: { owner: true },
  });
  if (!pet) return NextResponse.json({ error: "Pet not found" }, { status: 404 });

  // 1. Run triage on intake answers
  const triage = evaluateTriage(intakeAnswers as IntakeAnswers);

  // 2. Emergency interrupt: if CRITICAL, do NOT create a consult — return emergency guidance
  if (!dispositionAllowsOnlineBooking(triage.disposition)) {
    return NextResponse.json({
      emergencyInterrupt: true,
      triage: {
        severity: triage.severity,
        disposition: triage.disposition,
        recommendation: triage.recommendation,
        redFlagSymptoms: triage.redFlagSymptoms,
      },
      message: triage.recommendation,
    }, { status: 409 });
  }

  // 3. Evaluate compliance for this jurisdiction
  const jurisdiction = { countryCode: pet.owner?.countryCode ?? "US", regionCode: pet.owner?.regionCode ?? null };
  const compliance = evaluateCompliance(jurisdiction);

  // 4. Compute payment split
  let amountCents = CONSULT_PRICE_KOBOO;
  if (promoCode) {
    const discount = await prisma.promoCode.findUnique({ where: { code: promoCode } });
    if (discount && discount.uses < (discount.maxUses ?? Infinity) && (!discount.expiresAt || discount.expiresAt > new Date())) {
      amountCents = applyDiscount(amountCents, {
        type: discount.discountType as "PERCENT" | "FLAT",
        value: discount.discountValue,
      }).finalAmountCents;
      await prisma.promoCode.update({ where: { code: promoCode }, data: { uses: { increment: 1 } } });
    }
  }

  const split = computeSplit({
    amountCents,
    providerChargeCents: 30,
    platformRateBps: DEFAULT_PLATFORM_RATE_BPS,
  });

  // 5. Create consult + intake + payment in transaction
  const result = await prisma.$transaction(async (tx) => {
    const consult = await tx.consult.create({
      data: {
        type: type as "ON_DEMAND" | "SCHEDULED" | "FOLLOW_UP",
        status: "QUEUED",
        ownerId: session.userId,
        petId,
        vetId: vetId ?? null,
        countryCode: jurisdiction.countryCode,
        regionCode: jurisdiction.regionCode,
        priceCents: split.amountCents,
        currency: "NGN",
        waitEstimateMinutes: waitEstimateMinutes ?? null,
      },
    });

    await tx.intakeForm.create({
      data: {
        consultId: consult.id,
        petId,
        symptomCategory: intakeAnswers.symptomCategory,
        answers: intakeAnswers,
        photos: intakeAnswers.photos ?? [],
        triage: {
          create: {
            severity: triage.severity,
            disposition: triage.disposition,
            matchedRules: triage.matchedRuleIds,
            redFlagSymptoms: triage.redFlagSymptoms,
            recommendation: triage.recommendation,
          },
        },
      },
    });

    const payment = await tx.payment.create({
      data: {
        consultId: consult.id,
        ownerId: session.userId,
        amountCents: split.amountCents,
        currency: "NGN",
        platformFeeCents: split.platformFeeCents,
        vetEarnCents: split.vetEarnCents,
        providerChargeCents: split.providerChargeCents,
        status: "PENDING",
      },
    });

    return { consult, payment };
  });

  // 6. Return consult ID and payment details for Stripe checkout
  return NextResponse.json({
    consultId: result.consult.id,
    paymentId: result.payment.id,
    amountCents: split.amountCents,
    currency: "NGN",
    checkoutUrl: `/owner/checkout?paymentId=${result.payment.id}`,
    compliance: {
      adviceDisclaimerRequired: compliance.adviceDisclaimerRequired,
      remoteDiagnosisAllowed: compliance.remoteDiagnosisAllowed,
      recordingConsent: compliance.recordingConsent,
    },
  }, { status: 201 });
}