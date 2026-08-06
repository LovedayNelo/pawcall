import HeaderNav from "@/components/HeaderNav";

export default function LegalPage() {
  return (
    <div className="min-h-screen">
      <HeaderNav />
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-bold mb-4">Legal &amp; Terms</h1>

        <div className="prose prose-sm max-w-none space-y-6">
          <section>
            <h2>Important — This is Advice, Not a Diagnosis</h2>
            <p>
              PawCall connects pet owners with licensed veterinarians for video
              consultations intended for <strong>triage and general advice</strong>.
              A video consult is <strong>not a substitute for an in-person physical
              examination</strong>. Vets cannot perform palpation, auscultation, or
              diagnostics remotely, and may not prescribe or dispense controlled
              substances via this platform.
            </p>
          </section>

          <section>
            <h2>Veterinarian-Client-Patient Relationship (VCPR)</h2>
            <p>
              Most jurisdictions require an in-person examination to establish a
              VCPR before a vet can diagnose or prescribe. Our compliance engine
              enforces jurisdiction-specific rules so that prescribing is gated
              where a VCPR is required. If no VCPR exists, the vet will recommend
              an in-person visit.
            </p>
          </section>

          <section>
            <h2>Licensing — The Pet&apos;s Location Governs</h2>
            <p>
              A veterinarian must be licensed in the jurisdiction where the
              <strong> pet</strong> (not the vet) is physically located. Our matcher
              filters available vets by licensed jurisdictions automatically.
            </p>
          </section>

          <section>
            <h2>Emergency Use</h2>
            <p>
              <strong>If your pet is having a medical emergency, call your nearest
              24-hour emergency clinic immediately.</strong> This service is not for
              emergencies. If the triage flow detects emergency-level symptoms, the
              booking path is interrupted and you are directed to emergency care
              resources.
            </p>
          </section>

          <section>
            <h2>Call Recording & Consent</h2>
            <p>
              Calls may be recorded with explicit consent from all parties for
              quality assurance and dispute resolution. Recording consent is
              required where two-party consent laws apply.
            </p>
          </section>

          <section>
            <h2>Liability</h2>
            <p>
              PawCall is a facilitation platform. The veterinarian is solely
              responsible for their professional advice. By using this service you
              acknowledge these limitations.
            </p>
            <p>
              Full Terms of Service and Privacy Policy are available upon request.
              Questions? Contact{" "}
              <a href="mailto:support@pawscall.dev">support@pawscall.dev</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}