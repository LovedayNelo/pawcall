import { platformPrisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import HeaderNav from "@/components/HeaderNav";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PlatformAdminPage() {
  const session = await getSession();
  if (session?.role !== "ADMIN") redirect("/unauthorized");

  const [tenants, platformSettings] = await Promise.all([
    platformPrisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { users: true, auditLogs: true } },
      },
    }),
    platformPrisma.platformSettings.findMany({ orderBy: { key: "asc" } }),
  ]);

  const stats = {
    total: tenants.length,
    active: tenants.filter((t) => t.status === "ACTIVE").length,
    trial: tenants.filter((t) => t.status === "TRIAL").length,
    suspended: tenants.filter((t) => t.status === "SUSPENDED").length,
  };

  return (
    <div className="min-h-screen">
      <HeaderNav />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Platform Admin</h1>
          <Link href="/platform/signup" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand/90">
            New tenant
          </Link>
        </div>

        <div className="mb-8 grid grid-cols-4 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total tenants</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-2xl font-bold text-amber-600">{stats.trial}</p>
            <p className="text-sm text-muted-foreground">Trial</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-2xl font-bold text-red-600">{stats.suspended}</p>
            <p className="text-sm text-muted-foreground">Suspended</p>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">Tenants</h2>
          {tenants.length === 0 ? (
            <p className="text-muted-foreground">No tenants yet.</p>
          ) : (
            <div className="space-y-3">
              {tenants.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold">{t.name}</h3>
                      <span
                        className={`text-xs rounded-full px-2 py-0.5 ${
                          t.status === "ACTIVE" ? "bg-green-100 text-green-700"
                          : t.status === "TRIAL" ? "bg-amber-100 text-amber-700"
                          : t.status === "SUSPENDED" ? "bg-red-100 text-red-700"
                          : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {t.status}
                      </span>
                      <span className="text-xs rounded-full bg-muted px-2 py-0.5">{t.plan}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      <code className="text-xs">{t.subdomain}.*</code> · {t.databaseName} ·{" "}
                      {t._count.users} platform users
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Created {t.createdAt.toLocaleDateString()}</p>
                    <p>Consults/mo limit: {t.maxConsultsPerMonth}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">Platform settings</h2>
          {platformSettings.length === 0 ? (
            <p className="text-muted-foreground">No settings defined.</p>
          ) : (
            <div className="rounded-lg border border-border bg-card">
              {platformSettings.map((s) => (
                <div key={s.id} className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0">
                  <div>
                    <p className="font-mono text-sm font-medium">{s.key}</p>
                    {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                  </div>
                  <code className="text-xs text-muted-foreground">
                    {typeof s.value === "string" ? s.value : JSON.stringify(s.value)}
                  </code>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
