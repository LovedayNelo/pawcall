import HeaderNav from "@/components/HeaderNav";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <HeaderNav />
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold mb-4">About PawCall</h1>
        <p className="text-lg text-muted-foreground mb-8">
          On-demand and scheduled video consultations with licensed veterinarians for triage and advice.
        </p>

        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-2">What we do</h2>
            <p>
              PawCall connects pet owners with licensed veterinarians over video for immediate triage,
              advice, and follow-up. When in-person care is needed, we help you find a nearby clinic —
              and flag emergencies early through structured intake.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">How it works</h2>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Book an on-demand or scheduled video consultation.</li>
              <li>Complete a structured intake — triage flags emergencies and red flags.</li>
              <li>Talk to a licensed vet, licensed in your jurisdiction.</li>
              <li>Receive a written visit summary with a clear recommendation.</li>
              <li>Get referred to an in-person clinic if needed.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Important to know</h2>
            <p className="text-sm">
              Video vet advice is for triage only and is not a substitute for an in-person physical
              examination. Vets cannot prescribe controlled substances remotely. If you have an
              emergency, contact your nearest emergency veterinary hospital immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">For clinics</h2>
            <p className="text-sm">
              PawCall also powers dedicated workspaces for veterinary clinics.{" "}
              <Link href="/platform/signup" className="text-brand hover:underline">
                Start your clinic&apos;s workspace →
              </Link>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
