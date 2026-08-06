import { getTenantContext } from "@/lib/tenant/context";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import HeaderNav from "@/components/HeaderNav";
import Link from "next/link";
import { startConsult } from "@/app/actions/vet";
import OnlineToggle from "@/components/vet/OnlineToggle";
import { formatKobo } from "@/lib/formatCurrency";

export default async function VetDashboardPage() {
  const session = await getSession();
  if (!session?.userId || session.role !== "VET") redirect("/unauthorized");

  const { tenantPrisma: prisma } = await getTenantContext();
  if (!prisma) redirect("/login");

  const [profile, consults] = await Promise.all([
    prisma.vetProfile.findUnique({
      where: { userId: session.userId },
      include: { licenses: true },
    }),
    prisma.consult.findMany({
      where: { vetId: session.userId, status: { in: ["QUEUED", "IN_PROGRESS"] } },
      include: {
        pet: true,
        intakeForm: { include: { triage: true } },
        payment: { select: { amountCents: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!profile || profile.verificationStatus !== "VERIFIED") {
    redirect("/vet/onboarding");
  }

  return (
    <div className="min-h-screen">
      <HeaderNav />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Vet Dashboard</h1>
          <OnlineToggle isOnline={profile.isOnline} />
        </div>

        <div className="mb-4">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${profile.isOnline ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
            {profile.isOnline ? "Online" : "Offline"} · Available for on-demand
          </span>
          {" "}· Licensed in {profile.licenses.length} jurisdiction(s) · {profile.yearsExperience ?? 0} years exp
        </div>

        <h2 className="text-xl font-semibold mb-4">Active Consults ({consults.length})</h2>

        {consults.length === 0 ? (
          <p className="text-muted-foreground">No active consults right now. Set yourself online to receive on-demand calls.</p>
        ) : (
          <div className="space-y-4">
            {consults.map((c) => (
              <div key={c.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{c.pet?.name} ({c.pet?.species.toLowerCase()})</p>
                    <p className="text-sm text-muted-foreground">
                      Status: {c.status} · {formatKobo(c.priceCents)}
                    </p>
                    {c.intakeForm?.triage && (
                      <span className={`inline-block mt-1 rounded px-2 py-0.5 text-xs font-medium ${
                        c.intakeForm.triage.severity === "CRITICAL"
                          ? "bg-red-100 text-red-800"
                          : c.intakeForm.triage.severity === "HIGH"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        Triage: {c.intakeForm.triage.severity} / {c.intakeForm.triage.disposition}
                      </span>
                    )}
                    {c.intakeForm?.answers && (
                      <details className="mt-2 text-sm text-muted-foreground">
                        <summary className="cursor-pointer text-blue-600">View intake answers</summary>
                        <pre className="mt-1 whitespace-pre-wrap rounded bg-muted p-2 text-xs">
                          {JSON.stringify(c.intakeForm.answers, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {c.status === "QUEUED" && (
                      <form action={startConsult}>
                        <input type="hidden" name="consultId" value={c.id} />
                        <button
                          type="submit"
                          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand/90"
                        >
                          Accept &amp; Start
                        </button>
                      </form>
                    )}
                    <Link
                      href={`/consult/${c.id}/call?vet=true`}
                      className="rounded-md border border-border px-4 py-2 text-center text-sm font-medium hover:bg-muted"
                    >
                      Join Call
                    </Link>
                    <Link
                      href={`/consult/${c.id}/summary`}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Write Summary
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8">
          <Link
            href="/vet/earnings"
            className="text-sm text-brand hover:underline"
          >
            View earnings dashboard →
          </Link>
        </div>
      </main>
    </div>
  );
}
