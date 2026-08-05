import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

async function getPetOr404(petId: string, ownerId: string) {
  const pet = await prisma.pet.findFirst({
    where: { id: petId, ownerId, deletedAt: null },
  });
  if (!pet) return null;
  return pet;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const pet = await getPetOr404(id, session.userId);
  if (!pet) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(pet);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const pet = await getPetOr404(id, session.userId);
  if (!pet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.pet.update({
    where: { id },
    data: {
      name: body.name,
      breed: body.breed,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      sex: body.sex,
      spayedNeutered: body.spayedNeutered,
      weightKg: body.weightKg,
      allergies: body.allergies,
      chronicConditions: body.chronicConditions,
      medications: body.medications,
      vaccinationHistory: body.vaccinationHistory,
      photoUrl: body.photoUrl,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const pet = await getPetOr404(id, session.userId);
  if (!pet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.pet.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}