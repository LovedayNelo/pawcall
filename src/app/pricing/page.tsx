import HeaderNav from "@/components/HeaderNav";
import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <HeaderNav />
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold mb-2">Pricing</h1>
        <p className="text-muted-foreground mb-8">Simple, transparent pricing for veterinary advice.</p>

        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Video Consultation</h2>
          <p className="text-3xl font-bold text-brand mb-4">₦9,800<span className="text-lg text-muted-foreground">/consult</span></p>
          <ul className="text-left space-y-2 text-sm">
            <li>✓ 20-minute video consult with a licensed vet</li>
            <li>✓ Structured intake triage incl. emergency interrupt</li>
            <li>✓ Written visit summary with recommendation</li>
            <li>✓ Find-nearby-vet link if in-person care is needed</li>
          </ul>
          <Link
            href="/login?role=OWNER"
            className="mt-6 inline-block rounded-md bg-brand px-6 py-3 font-medium text-brand-foreground hover:bg-brand/90"
          >
            Book Now
          </Link>
        </div>

        <div className="mt-8 rounded-lg border border-border bg-card p-8">
          <h2 className="text-xl font-bold mb-2">Membership (coming soon)</h2>
          <p className="text-sm text-muted-foreground">
            Unlimited chat triage + discounted video consults. Sign up to be notified.
          </p>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Video vet advice is for triage only and is not a substitute for an in-person
          physical examination. Vets cannot prescribe controlled substances remotely.
        </p>
      </main>
    </div>
  );
}