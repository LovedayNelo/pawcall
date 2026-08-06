import { getTenantContext } from "@/lib/tenant/context";
import { notFound } from "next/navigation";
import HeaderNav from "@/components/HeaderNav";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";

export default async function ConsultPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const { id } = await params;
  const consultId = id;

  const { tenantPrisma: prisma } = await getTenantContext();
  if (!prisma) notFound();
  const consult = await prisma.consult.findUnique({
    where: { id: consultId },
    include: {
      pet: true,
      vet: { select: { id: true, name: true } },
      intakeForm: { include: { triage: true } },
      summary: true,
      payment: { select: { id: true, amountCents: true, status: true, stripePaymentIntentId: true } },
      referral: { include: { clinic: true } },
      review: true,
    },
  });
  if (!consult) notFound();

  const statusColor: Record<string, string> = {
    QUEUED: "bg-yellow-100 text-yellow-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    NO_SHOW: "bg-gray-100 text-gray-800",
    DROPPED: "bg-gray-100 text-gray-800",
  };
  const statusClass = statusColor[consult.status] ?? "bg-gray-100";

  const outcomeLabels: Record<string, string> = {
    MONITOR_AT_HOME: "Monitor at Home",
    IN_PERSON_NON_URGENT: "See a Vet In-Person (Non-Urgent)",
    IN_PERSON_URGENT: "See a Vet In-Person Urgently",
    EMERGENCY: "Emergency Care Needed",
    NOT_DETERMINED: "Not Determined",
  };

  const isMine = session?.userId === consult.ownerId;
  if (!isMine) notFound();

  return (
    <div className="min-h-screen">
      <HeaderNav />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Consult #{consult.id.slice(-6)}</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}>
              {consult.status.replace("_", " ").toLowerCase()}
            </span>
          </div>

          {consult.pet && (
            <div className="border border-border rounded-lg p-4 mb-4">
              <strong>Pet:</strong> {consult.pet.name} — {consult.pet.species.toLowerCase()}
              {consult.pet.breed && `, ${consult.pet.breed}`}
            </div>
          )}

          {consult.status === "QUEUED" && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 mb-4">
              <strong>Waiting for a Vet</strong>
              <p className="mt-2 text-sm">{consult.vet ? `Assigned to ${consult.vet.name}` : "Looking for an available licensed vet..."}</p>
              <p className="mt-1 text-sm">{consult.waitEstimateMinutes ? `Estimated wait: ${consult.waitEstimateMinutes} min` : "A licensed vet will join shortly."}</p>
            </div>
          )}

          {consult.status === "IN_PROGRESS" && (
            <div className="rounded-lg border border-blue-500 bg-blue-50 p-4 mb-4">
              <strong>Live Consult</strong>
              <p className="mt-2 text-sm">Your video call is in progress. The waiting room is open.</p>
              <Link
                href={`/consult/${consult.id}/call`}
                className="mt-2 inline-block rounded-md bg-brand px-4 py-2 text-brand-foreground hover:bg-brand/90"
              >
                Join Call
              </Link>
            </div>
          )}

          {consult.status === "COMPLETED" && consult.summary && (
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="text-xl font-bold mb-4">Visit Summary</h2>
                <div>
                  <h3 className="font-semibold">Assessment</h3>
                  <p className="mb-4">{consult.summary.assessment || "Not provided"}</p>

                  {consult.summary.recommendation && (
                    <div
                      className={`mb-4 rounded-md p-4 ${
                        consult.summary.recommendation === "EMERGENCY"
                          ? "bg-red-50 border border-red-200"
                          : consult.summary.recommendation === "IN_PERSON_URGENT"
                          ? "bg-amber-50 border border-amber-200"
                          : consult.summary.recommendation === "IN_PERSON_NON_URGENT"
                          ? "bg-amber-50 border border-amber-200"
                          : "bg-green-50 border border-green-200"
                      }`}
                    >
                      <strong>Recommendation: {outcomeLabels[consult.summary.recommendation] ?? consult.summary.recommendation}</strong>
                      {consult.summary.recommendationDetail && (
                        <p className="text-sm mt-1">{consult.summary.recommendationDetail}</p>
                      )}
                    </div>
                  )}

                  {consult.summary.homeCareAdvice && (
                    <>
                      <h3 className="font-semibold">Home Care Advice</h3>
                      <p className="mb-3">{consult.summary.homeCareAdvice}</p>
                    </>
                  )}
                  {consult.summary.redFlagsToWatch && (
                    <>
                      <h3 className="font-semibold text-red-700">Red Flags to Watch</h3>
                      <p className="mb-3">{consult.summary.redFlagsToWatch}</p>
                    </>
                  )}
                  {consult.summary.plan && (
                    <>
                      <h3 className="font-semibold">Follow-up Plan</h3>
                      <p className="mb-3">{consult.summary.plan}</p>
                    </>
                  )}
                </div>
              </div>

              {consult.summary.recommendation &&
                consult.summary.recommendation !== "MONITOR_AT_HOME" && (
                  <Link
                    href={`https://www.google.com/maps/search/?api=1&query=emergency+vet+near+me`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block rounded-md bg-emergency px-4 py-2 text-emergency-foreground hover:bg-emergency/90"
                  >
                    Find Nearby Vet
                  </Link>
                )}
            </div>
          )}

          {consult.review && (
            <p className="text-sm text-green-600 mt-4">
              ⭐ {consult.review.rating}/5 — thank you for your feedback.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}