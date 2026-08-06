import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getTenantContext } from "@/lib/tenant/context";

async function getPrisma() {
  const { tenantPrisma } = await getTenantContext();
  if (!tenantPrisma) {
    throw new Error("No tenant context available");
  }
  return tenantPrisma;
}

export async function GET() {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prisma = await getPrisma();
  const pets = await prisma.pet.findMany({
    where: { ownerId: session.userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(pets);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const prisma = await getPrisma();
  const pet = await prisma.pet.create({
    data: {
      ownerId: session.userId,
      name: body.name,
      species: body.species,
      breed: body.breed,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      sex: body.sex,
      spayedNeutered: body.spayedNeutered,
      weightKg: body.weightKg,
      allergies: body.allergies ?? [],
      chronicConditions: body.chronicConditions ?? [],
      medications: body.medications ?? [],
      vaccinationHistory: body.vaccinationHistory ?? [],
      photoUrl: body.photoUrl,
    },
  });
  return NextResponse.json(pet, { status: 201 });
}