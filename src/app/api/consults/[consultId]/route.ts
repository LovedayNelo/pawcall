import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { canPrescribeRemotely } from "@/domain/compliance/compliance";
import type { ConsultOutcome } from "@/generated/prisma/client";

// Vet: write a consult summary (SOAP); owner/admin: read it
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ consultId: string }> },
) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { consultId } = await params;
  const consult = await prisma.consult.findUnique({
    where: { id: consultId },
    include: { summary: true, pet: true, vet: true, referral: true },
  });
  if (!consult) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = consult.ownerId === session.userId;
  const isVet = consult.vetId === session.userId;
  const isAdmin = session.role === "ADMIN";
  if (!isOwner && !isVet && !isAdmin)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(consult);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ consultId: string }> },
) {
  const session = await getSession();
  if (!session?.userId || session.role !== "VET")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { consultId } = await params;
  const consult = await prisma.consult.findUnique({ where: { id: consultId } });
  if (!consult) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (consult.vetId !== session.userId)
    return NextResponse.json({ error: "Not your consult" }, { status: 403 });

  const body = await req.json();
  const {
    subjective,
    objective,
    assessment,
    plan,
    homeCareAdvice,
    redFlagsToWatch,
    recommendation,
    recommendationDetail,
    prescribedMeds,
    triggerEmergencyReferral = false,
  } = body;

  // Compliance gate on prescribing: non-controlled meds only if allowed by jurisdiction+VCPR
  if (prescribedMeds && prescribedMeds.length > 0) {
    const decision = canPrescribeRemotely(
      { countryCode: consult.countryCode ?? "US", regionCode: consult.regionCode },
      { hasVCPR: body.hasVCPR ?? false, controlled: false },
    );
    if (!decision.allowed) {
      return NextResponse.json({
        error: "Prescribing not permitted in this jurisdiction",
        reason: decision.reason,
      }, { status: 403 });
    }
  }

  // Emergency referral: vet flags that in-person emergency care is needed
  await prisma.$transaction(async (tx) => {
    const summary = await tx.consultSummary.upsert({
      where: { consultId },
      create: {
        consultId,
        subjective,
        objective,
        assessment,
        plan,
        homeCareAdvice,
        redFlagsToWatch,
        recommendation,
        recommendationDetail,
        prescribedMeds,
      },
      update: {
        subjective,
        objective,
        assessment,
        plan,
        homeCareAdvice,
        redFlagsToWatch,
        recommendation,
        recommendationDetail,
        prescribedMeds,
      },
    });

    await tx.consult.update({
      where: { id: consultId },
      data: {
        outcome: recommendation as ConsultOutcome,
        status: "COMPLETED",
      },
    });

    void summary; // summary persisted; consult links via consultId FK

    if (triggerEmergencyReferral) {
      // Find the nearest partner clinic (first available for MVP)
      const clinic = await tx.partnerClinic.findFirst({
        where: { acceptsReferrals: true },
        orderBy: { name: "asc" },
      });
      if (clinic) {
        await tx.referral.create({
          data: {
            consultId,
            clinicId: clinic.id,
            notes: recommendationDetail ?? plan,
            status: "PENDING",
          },
        });
      }
    }
  });

  return NextResponse.json({ success: true, consultationId: consultId });
}