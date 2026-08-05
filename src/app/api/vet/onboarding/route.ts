import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await getSession();
  if (!session?.userId || session.role !== "VET")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.vetProfile.findUnique({
    where: { userId: session.userId },
    include: { licenses: true },
  });
  return NextResponse.json({ profile });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId || session.role !== "VET")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  // Vet credentials: license number + jurisdiction + (optional) malpractice proof
  const profile = await prisma.vetProfile.upsert({
    where: { userId: session.userId },
    update: {
      bio: body.bio,
      specialty: body.specialty,
      yearsExperience: body.yearsExperience,
      languages: body.languages ?? ["en"],
    },
    create: {
      userId: session.userId,
      bio: body.bio,
      specialty: body.specialty,
      yearsExperience: body.yearsExperience,
      languages: body.languages ?? ["en"],
    },
  });

  if (body.licenses && Array.isArray(body.licenses)) {
    for (const lic of body.licenses) {
      if (lic.licenseNumber && lic.countryCode && lic.regionCode) {
        await prisma.license.create({
          data: {
            vetProfileId: profile.id,
            licenseNumber: lic.licenseNumber,
            countryCode: lic.countryCode.toUpperCase(),
            regionCode: lic.regionCode.toUpperCase(),
            issuedAt: lic.issuedAt ? new Date(lic.issuedAt) : undefined,
            expiresAt: lic.expiresAt ? new Date(lic.expiresAt) : undefined,
          },
        });
      }
    }
  }

  return NextResponse.json({ success: true, profileId: profile.id });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId || session.role !== "VET")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const profile = await prisma.vetProfile.updateMany({
    where: { userId: session.userId },
    data: {
      bio: body.bio,
      specialty: body.specialty,
      yearsExperience: body.yearsExperience,
      languages: body.languages,
      isOnline: body.isOnline,
    },
  });
  return NextResponse.json({ success: true, count: profile.count });
}