import { getTenantContext } from "@/lib/tenant/context";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import HeaderNav from "@/components/HeaderNav";
import Link from "next/link";

export default async function VetOnboardingPage() {
  const session = await getSession();
  if (!session?.userId || session.role !== "VET") redirect("/unauthorized");

  const { tenantPrisma: prisma } = await getTenantContext();
  if (!prisma) redirect("/login");

  const profile = await prisma.vetProfile.findUnique({
    where: { userId: session.userId },
    include: { licenses: true },
  });

  const status = (profile?.verificationStatus ?? "PENDING") as "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";

  const statusMessage = {
    PENDING: "Your credentials are under review. An admin will verify your license shortly.",
    VERIFIED: "Your profile is verified.",
    REJECTED: "Your application was rejected. Contact support.",
    SUSPENDED: "Your account has been suspended.",
  }[status];

  return (
    <div className="min-h-screen">
      <HeaderNav />
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-bold mb-2">Veterinarian Onboarding</h1>
        <p className="text-muted-foreground mb-6">
          Verify your license and set up your profile so pet owners can book you.
        </p>

        <div className="mb-4 rounded-md border border-border p-3 text-sm">
          Status: <strong className="font-medium">{status}</strong> — {statusMessage}
        </div>

        <form action={saveProfile} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Bio / Specialty</label>
            <textarea
              name="bio"
              rows={3}
              defaultValue={profile?.bio ?? ""}
              placeholder="Brief introduction and areas of focus..."
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Specialty</label>
              <input name="specialty" type="text" defaultValue={profile?.specialty ?? ""} placeholder="e.g. Small Animal, Dermatology" className="w-full rounded-md border border-border bg-background px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Years of Experience</label>
              <input name="yearsExperience" type="number" defaultValue={profile?.yearsExperience?.toString() ?? ""} className="w-full rounded-md border border-border bg-background px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Languages (comma separated)</label>
            <input name="languages" type="text" defaultValue={(profile?.languages ?? ["en"]).join(", ")} className="w-full rounded-md border border-border bg-background px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">License Number</label>
            <input name="licenseNumber" type="text" placeholder="e.g. VET-12345" required className="w-full rounded-md border border-border bg-background px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <input name="countryCode" type="text" placeholder="US" required defaultValue="US" className="w-full rounded-md border border-border bg-background px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">State / Region</label>
              <input name="regionCode" type="text" placeholder="WA" required className="w-full rounded-md border border-border bg-background px-3 py-2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">License Issued</label>
              <input name="issuedAt" type="date" className="w-full rounded-md border border-border bg-background px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">License Expiry</label>
              <input name="expiresAt" type="date" className="w-full rounded-md border border-border bg-background px-3 py-2" />
            </div>
          </div>

          <div className="flex items-start gap-2 pt-2">
            <input type="checkbox" name="malpracticeInsuranceVerified" value="true" defaultChecked={profile?.malpracticeInsuranceVerified} />
            <label className="text-sm">I have malpractice insurance covering veterinary telehealth.</label>
          </div>

          <button
            type="submit"
            disabled={status === "SUSPENDED"}
            className="rounded-md bg-brand py-2 px-6 font-medium text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
          >
            Save &amp; Submit for Review
          </button>
        </form>

        <p className="mt-4 text-xs text-muted-foreground">
          By submitting, you confirm you are a licensed veterinarian in the declared
          jurisdiction(s) and agree to the{" "}
          <Link href="/legal" className="underline">Terms of Service</Link>.
          Note: veterinary telehealth regulations vary by state/country; you must be
          licensed where the pet is located.
        </p>

        {profile && (
          <Link
            href="/vet/dashboard"
            className="mt-6 block text-sm text-brand hover:underline"
          >
            &larr; Back to Dashboard
          </Link>
        )}
      </main>
    </div>
  );
}

async function saveProfile(formData: FormData) {
  "use server";
  const { getTenantContext } = await import("@/lib/tenant/context");
  const { tenantPrisma: prisma } = await getTenantContext();
  if (!prisma) redirect("/unauthorized");
  const { getSession } = await import("@/lib/auth/session");
  const session = await getSession();
  if (!session?.userId || session.role !== "VET") redirect("/unauthorized");

  const bio = formData.get("bio")?.toString() || null;
  const specialty = formData.get("specialty")?.toString() || null;
  const yearsExperience = formData.get("yearsExperience")
    ? Number(formData.get("yearsExperience"))
    : null;
  const languages = (formData.get("languages")?.toString() || "en")
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);
  const licenseNumber = formData.get("licenseNumber")?.toString() || "";
  const countryCode = formData.get("countryCode")?.toString().toUpperCase() || "US";
  const regionCode = formData.get("regionCode")?.toString().toUpperCase() || "";
  const issuedAt = formData.get("issuedAt") ? new Date(formData.get("issuedAt")!.toString()) : undefined;
  const expiresAt = formData.get("expiresAt") ? new Date(formData.get("expiresAt")!.toString()) : undefined;

  await prisma.$transaction(async (tx) => {
    const profile = await tx.vetProfile.upsert({
      where: { userId: session.userId },
      update: { bio, specialty, yearsExperience, languages },
      create: { userId: session.userId, bio, specialty, yearsExperience, languages },
    });

    // Only add a new license (don't duplicate)
    const existing = await tx.license.findFirst({
      where: { vetProfileId: profile.id, licenseNumber, countryCode, regionCode },
    });
    if (!existing && licenseNumber) {
      await tx.license.create({
        data: {
          vetProfileId: profile.id,
          licenseNumber,
          countryCode,
          regionCode,
          issuedAt,
          expiresAt,
        },
      });
    }
  });

  redirect("/vet/dashboard");
}