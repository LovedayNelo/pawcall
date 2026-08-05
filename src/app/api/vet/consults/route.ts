import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

// Vet: list consults assigned to this vet
export async function GET() {
  const session = await getSession();
  if (!session?.userId || session.role !== "VET")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const consults = await prisma.consult.findMany({
    where: { vetId: session.userId, status: { in: ["QUEUED", "IN_PROGRESS"] } },
    include: {
      pet: { include: { owner: { select: { name: true, email: true } } } },
      intakeForm: { include: { triage: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(consults);
}

// Vet: join a queued consult
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId || session.role !== "VET")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { consultId, action } = body; // action: "accept" | "decline" | "start" | "complete"

  const consult = await prisma.consult.findUnique({ where: { id: consultId } });
  if (!consult) return NextResponse.json({ error: "Consult not found" }, { status: 404 });
  if (consult.vetId && consult.vetId !== session.userId)
    return NextResponse.json({ error: "Already assigned to another vet" }, { status: 409 });

  const updates: Record<string, unknown> = {};
  switch (action) {
    case "accept":
      updates.status = "QUEUED";
      updates.vetId = session.userId;
      break;
    case "start":
      updates.status = "IN_PROGRESS";
      updates.vetId = session.userId;
      updates.startedAt = new Date();
      break;
    case "complete":
      updates.status = "COMPLETED";
      updates.endedAt = new Date();
      if (consult.startedAt) {
        updates.durationMinutes = Math.round(
          (new Date().getTime() - new Date(consult.startedAt).getTime()) / 60_000,
        );
      }
      break;
    case "decline":
      updates.status = "CANCELLED";
      break;
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const updated = await prisma.consult.update({
    where: { id: consultId },
    data: updates,
    include: { payment: true },
  });

  return NextResponse.json(updated);
}