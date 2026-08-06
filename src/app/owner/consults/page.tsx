import { getTenantContext } from "@/lib/tenant/context";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import HeaderNav from "@/components/HeaderNav";
import Link from "next/link";
import { formatKobo } from "@/lib/formatCurrency";

export default async function OwnerConsultsPage() {
  const session = await getSession();
  if (!session?.userId) redirect("/login");

  const { tenantPrisma: prisma } = await getTenantContext();
  if (!prisma) redirect("/login");

  const consults = await prisma.consult.findMany({
    where: { ownerId: session.userId },
    include: {
      pet: true,
      vet: { select: { name: true } },
      summary: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen">
      <HeaderNav />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Your Consultations</h1>
          <Link
            href="/owner/pets"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand/90"
          >
            Book new consult
          </Link>
        </div>

        {consults.length === 0 ? (
          <p className="text-muted-foreground">
            No consultations yet.{" "}
            <Link href="/owner/pets" className="text-brand hover:underline">
              Book your first consult
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-4">
            {consults.map((c) => (
              <div key={c.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {c.pet?.name ?? "Consultation"} · {new Date(c.createdAt).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Status: <span className="font-medium">{c.status}</span>
                      {" · "}Outcome: <span className="font-medium">{c.outcome ?? "Pending"}</span>
                      {" · "}{formatKobo(c.priceCents)}
                    </p>
                    {c.vet && (
                      <p className="text-sm text-muted-foreground">Vet: {c.vet.name}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 text-sm">
                    {c.status === "IN_PROGRESS" && (
                      <Link
                        href={`/consult/${c.id}/call`}
                        className="rounded-md bg-brand px-4 py-2 text-center font-medium text-brand-foreground hover:bg-brand/90"
                      >
                        Join Call
                      </Link>
                    )}
                    <Link
                      href={`/consult/${c.id}`}
                      className="rounded-md border border-border px-4 py-2 text-center font-medium hover:bg-muted"
                    >
                      View Details
                    </Link>
                    {c.summary && (
                      <Link
                        href={`/consult/${c.id}/summary`}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        View Summary
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
