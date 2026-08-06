import { getTenantContext } from "@/lib/tenant/context";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import HeaderNav from "@/components/HeaderNav";

async function getPrisma() {
  const { tenantPrisma } = await getTenantContext();
  if (!tenantPrisma) {
    throw new Error("No tenant context available");
  }
  return tenantPrisma;
}

export default async function AdminVetVerificationPage() {
  const session = await getSession();
  if (session?.role !== "ADMIN") redirect("/unauthorized");

  const prisma = await getPrisma();
  const profiles = await prisma.vetProfile.findMany({
    where: { verificationStatus: "PENDING" },
    include: { user: true, licenses: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="min-h-screen">
      <HeaderNav />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Vet Credential Verification</h1>
        <p className="text-sm text-muted-foreground mb-4">{profiles.length} pending {profiles.length === 1 ? "application" : "applications"}</p>

        {profiles.length === 0 ? (
          <p>No vet applications pending review.</p>
        ) : (
          <div className="space-y-4">
            {profiles.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">{p.user.name}</h3>
                    <p className="text-sm text-muted-foreground">{p.user.email}</p>
                  </div>
                  <div className="flex gap-2">
                    {p.licenses.map((lic) => (
                      <span key={lic.id} className="text-xs rounded bg-muted px-2 py-1">
                        {lic.licenseNumber} ({lic.countryCode}-{lic.regionCode})
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <p><strong>Bio:</strong> {p.bio}</p>
                  <p><strong>Specialty:</strong> {p.specialty}</p>
                  <p><strong>Experience:</strong> {p.yearsExperience} years</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <form action={verifyVet} method="post">
                    <input type="hidden" name="userId" value={p.user.id} />
                    <input type="hidden" name="action" value="approve" />
                    <button name="submit" value="approve" className="rounded-md bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700">Approve</button>
                  </form>
                  <form action={verifyVet} method="post">
                    <input type="hidden" name="userId" value={p.user.id} />
                    <input type="hidden" name="action" value="reject" />
                    <button name="submit" value="reject" className="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">Reject</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

async function verifyVet(formData: FormData) {
  "use server";
  const { getTenantContext } = await import("@/lib/tenant/context");
  const { getSession } = await import("@/lib/auth/session");
  const session = await getSession();
  if (session?.role !== "ADMIN") redirect("/unauthorized");

  const userId = formData.get("userId")?.toString();
  const action = formData.get("action")?.toString();
  if (!userId || !action) return;

  const { tenantPrisma: db } = await getTenantContext();
  if (!db) throw new Error("No tenant context available");

  await db.vetProfile.updateMany({
    where: { userId },
    data: {
      verificationStatus:
        action === "approve" ? "VERIFIED" : action === "reject" ? "REJECTED" : "SUSPENDED",
      idVerified: action === "approve",
      malpracticeInsuranceVerified: action === "approve",
    },
  });

  await db.auditLog.create({
    data: {
      actorId: session.userId,
      action: `VET_PROFILE_${action.toUpperCase()}`,
      entityType: "VetProfile",
      entityId: userId,
    },
  });

  redirect("/admin/dashboard");
}
