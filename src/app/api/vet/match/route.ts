import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant/context";

async function getPrisma() {
  const { tenantPrisma } = await getTenantContext();
  if (!tenantPrisma) {
    throw new Error("No tenant context available");
  }
  return tenantPrisma;
}

// Vet matcher: find an available, verified vet licensed in the owner's jurisdiction
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { countryCode = "US", regionCode = null } = body;

  const prisma = await getPrisma();
  const vets = await prisma.vetProfile.findMany({
    where: {
      verificationStatus: "VERIFIED",
      isOnline: true,
      licenses: { some: { countryCode, regionCode, verificationStatus: "VERIFIED" } },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      licenses: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!vets.length) {
    return NextResponse.json({
      matched: false,
      message: "No licensed vet currently available in your jurisdiction. Please try scheduling.",
    });
  }

  // Weight vets by active consult count (fewer = better — less busy)
  const vetStats = await Promise.all(
    vets.map(async (vp) => {
      const activeCount = await prisma.consult.count({
        where: { vetId: vp.userId, status: { in: ["QUEUED", "IN_PROGRESS"] } },
      });
      return { ...vp, _activeConsults: activeCount };
    }),
  );

  const best = vetStats.reduce((prev: typeof vetStats[0], curr: typeof vetStats[0]) =>
    curr._activeConsults < prev._activeConsults ? curr : prev
  );
  const waitEstimate = best._activeConsults * 5 + 5; // 5 min per queued consult + 5 min buffer

  return NextResponse.json({
    matched: true,
    vet: {
      id: best.userId,
      name: best.user.name,
      email: best.user.email,
    },
    waitEstimateMinutes: waitEstimate,
  });
}