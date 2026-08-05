import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import HeaderNav from "@/components/HeaderNav";
import Link from "next/link";

export default async function WriteSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const { id } = await params;
  const consult = await prisma.consult.findUnique({
    where: { id },
    include: { pet: true, vet: { select: { name: true } }, intakeForm: { include: { triage: true } } },
  });
  if (!consult) redirect("/owner/pets");

  // Only the assigned vet can write a summary (or admin)
  if (consult.vetId !== session.userId && session.role !== "ADMIN") redirect("/unauthorized");

  const outcomeOptions = [
    "MONITOR_AT_HOME",
    "IN_PERSON_NON_URGENT",
    "IN_PERSON_URGENT",
    "EMERGENCY",
  ];

  return (
    <div className="min-h-screen">
      <HeaderNav />
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Write Visit Summary</h1>
        <p className="text-sm text-muted-foreground mb-4">
          For {consult.pet?.name} ({consult.pet?.species})
        </p>

        <form action={saveSummary} className="space-y-6">
          <input type="hidden" name="consultId" value={consult.id} />

          <div>
            <label className="block text-sm font-medium mb-1">Subjective (what the owner reported)</label>
            <textarea name="subjective" rows={3} required className="w-full rounded-md border border-border bg-background px-3 py-2" placeholder="Owner reports..." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Objective (what the vet observed on camera)</label>
            <textarea name="objective" rows={3} required className="w-full rounded-md border border-border bg-background px-3 py-2" placeholder="On exam via video..." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Assessment</label>
            <textarea name="assessment" rows={3} required className="w-full rounded-md border border-border bg-background px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Plan / Recommendations</label>
            <textarea name="plan" rows={3} required className="w-full rounded-md border border-border bg-background px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Home Care Advice</label>
            <textarea name="homeCareAdvice" rows={2} className="w-full rounded-md border border-border bg-background px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Red Flags to Watch</label>
            <textarea name="redFlagsToWatch" rows={2}
              placeholder='e.g. "If breathing worsens, seek emergency care immediately."'
              className="w-full rounded-md border border-border bg-background px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Recommendation *</label>
            <select name="recommendation" required className="w-full rounded-md border border-border bg-background px-3 py-2">
              <option value="">Select...</option>
              {outcomeOptions.map((v) => (
                <option key={v} value={v}>{v.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Recommendation Detail (why)</label>
            <textarea name="recommendationDetail" rows={2} className="w-full rounded-md border border-border bg-background px-3 py-2" />
          </div>

          <div className="flex items-start gap-2">
            <input type="checkbox" name="triggerEmergencyReferral" value="true" id="refFlag" />
            <label htmlFor="refFlag" className="text-sm">
              Check to immediately refer to a nearest partner emergency clinic (use for urgent cases needing physical care).
            </label>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="rounded-md bg-brand py-2 px-6 font-medium text-brand-foreground hover:bg-brand/90"
            >
              Save Summary
            </button>
            <Link href={`/consult/${consult.id}/call`} className="rounded-md border border-border py-2 px-6 hover:bg-muted">
              Back to Call
            </Link>
          </div>
        </form>

        <div className="mt-8 border-t border-border pt-6">
          <h2 className="font-semibold text-red-700">Prescribing Notice</h2>
          <p className="text-sm text-muted-foreground">
            You may not prescribe controlled substances via video. Non-controlled
            prescribing is only permitted where the jurisdiction allows it and a
            valid VCPR exists. Enter any proposed medication in "Plan" for the
            owner to take to an in-person vet if prescribing is restricted.
          </p>
        </div>
      </main>
    </div>
  );
}

async function saveSummary(formData: FormData) {
  "use server";
  const { prisma } = await import("@/lib/db/prisma");
  const { getSession } = await import("@/lib/auth/session");
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const consultId = formData.get("consultId")?.toString() ?? "";
  const consult = await prisma.consult.findUnique({ where: { id: consultId } });
  if (!consult || consult.vetId !== session.userId) redirect("/unauthorized");

  const recommendation = (formData.get("recommendation")?.toString() ?? "NOT_DETERMINED") as "MONITOR_AT_HOME" | "IN_PERSON_NON_URGENT" | "IN_PERSON_URGENT" | "EMERGENCY" | "NOT_DETERMINED";

  await prisma.consultSummary.upsert({
    where: { consultId },
    create: {
      consultId,
      subjective: formData.get("subjective")?.toString() ?? "",
      objective: formData.get("objective")?.toString() ?? "",
      assessment: formData.get("assessment")?.toString() ?? "",
      plan: formData.get("plan")?.toString() ?? "",
      homeCareAdvice: formData.get("homeCareAdvice")?.toString() || undefined,
      redFlagsToWatch: formData.get("redFlagsToWatch")?.toString() || undefined,
      recommendation,
      recommendationDetail: formData.get("recommendationDetail")?.toString() || undefined,
    },
    update: {
      subjective: formData.get("subjective")?.toString() ?? "",
      objective: formData.get("objective")?.toString() ?? "",
      assessment: formData.get("assessment")?.toString() ?? "",
      plan: formData.get("plan")?.toString() ?? "",
      homeCareAdvice: formData.get("homeCareAdvice")?.toString() || undefined,
      redFlagsToWatch: formData.get("redFlagsToWatch")?.toString() || undefined,
      recommendation,
      recommendationDetail: formData.get("recommendationDetail")?.toString() || undefined,
    },
  });

  await prisma.consult.update({
    where: { id: consultId },
    data: { status: "COMPLETED", outcome: recommendation },
  });

  redirect(`/consult/${consultId}`);
}
