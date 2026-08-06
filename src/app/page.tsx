import HeaderNav from "@/components/HeaderNav";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <HeaderNav />
      <main className="container mx-auto px-4 py-12">
        <section className="text-center py-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Trusted vet advice — before the clinic visit.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Pet owners can connect with licensed veterinarians for paid,
            on-demand or scheduled video consultations. Our triage-first flow
            tells you whether a symptom needs urgent in-person care, routine
            care, or can be managed at home.
          </p>
          <Link
            href="/login?role=OWNER"
            className="inline-flex items-center justify-center rounded-md bg-brand px-6 py-3 font-medium text-brand-foreground shadow transition hover:bg-brand/90"
          >
            Talk to a vet now
          </Link>
        </section>

        <section className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="font-bold mb-2">On-demand triage</h3>
            <p className="text-sm text-muted-foreground">
              Describe symptoms via a guided intake. Our emergency interrupt
              flags red-flag symptoms and routes straight to ER guidance when
              needed.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="font-bold mb-2">Scheduled consults</h3>
            <p className="text-sm text-muted-foreground">
              Pick an available licensed vet by specialty and time zone.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="font-bold mb-2">Written summary</h3>
            <p className="text-sm text-muted-foreground">
              Get a post-call visit summary with home-care advice and clear next
              steps, plus a one-tap &quot;find nearby vet&quot; link.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}