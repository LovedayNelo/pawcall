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

// Admin: list vet profiles pending verification
export async function GET() {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const prisma = await getPrisma();
  const profiles = await prisma.vetProfile.findMany({
    where: { verificationStatus: "PENDING" },
    include: { user: true, licenses: true },
  });
  return NextResponse.json(profiles);
}

// Admin: verify or reject a vet profile
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = await req.json();
  const { userId, action, note } = body; // action: "approve" | "reject" | "suspend"

  const prisma = await getPrisma();
  const update: Record<string, unknown> = {};
  switch (action) {
    case "approve":
      update.verificationStatus = "VERIFIED";
      update.idVerified = true;
      update.malpracticeInsuranceVerified = true;
      break;
    case "reject":
      update.verificationStatus = "REJECTED";
      update.idVerified = false;
      break;
    case "suspend":
      update.verificationStatus = "SUSPENDED";
      break;
    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const profile = await prisma.vetProfile.updateMany({
    where: { userId },
    data: update,
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: session.userId,
      action: `VET_PROFILE_${action.toUpperCase()}`,
      entityType: "VetProfile",
      entityId: userId,
      details: { note, updated: profile.count },
    },
  });

  return NextResponse.json({ success: true });
}
