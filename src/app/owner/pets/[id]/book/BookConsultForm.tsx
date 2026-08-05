"use client";

import HeaderNav from "@/components/HeaderNav";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PetSpecies } from "@/generated/prisma/client";

interface Pet {
  id: string;
  name: string;
  species: PetSpecies;
  breed: string | null;
  weightKg: number | null;
}

interface EmergencyResult {
  emergencyInterrupt: true;
  triage: {
    severity: string;
    disposition: string;
    recommendation: string;
    redFlagSymptoms: string[];
  };
}

export default function BookConsultPage({
  params,
  pet,
}: {
  params: { id: string };
  pet: Pet | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"type" | "intake" | "review" | "checkout">("type");
  const [consultType, setConsultType] = useState<"SCHEDULED" | "ON_DEMAND">("SCHEDULED");
  const [intake, setIntake] = useState<Record<string, unknown>>({});
  const [emergency, setEmergency] = useState<EmergencyResult | null>(null);
  const [consultId, setConsultId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<{ matched: boolean; vet?: { id: string; name: string }; message?: string } | null>(null);

  async function submitIntake(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);

    const answers = {
      symptomCategory: data.get("symptomCategory")?.toString() || undefined,
      species: pet?.species || undefined,
      breed: pet?.breed || undefined,
      weightKg: pet?.weightKg ?? undefined,
      primarySymptom: data.get("primarySymptom")?.toString() || undefined,
      onset: data.get("onset") as "sudden" | "gradual" | "unknown" | undefined,

      difficultyBreathing: data.get("difficultyBreathing") === "true",
      blueOrPaleGums: data.get("blueOrPaleGums") === "true",
      collapsed: data.get("collapsed") === "true",
      unresponsive: data.get("unresponsive") === "true",
      seizures: data.get("seizures") === "true",
      bleeding: data.get("bleeding") === "true",
      bleedingUncontrollable: data.get("bleedingUncontrollable") === "true",
      hitByCar: data.get("hitByCar") === "true",
      severeTrauma: data.get("severeTrauma") === "true",
      severePain: data.get("severePain") === "true",

      toxinExposure: data.get("toxinExposure") === "true",
      toxinType: data.get("toxinType")?.toString() || undefined,

      vomiting: data.get("vomiting") === "true",
      vomitingFrequencyPer24h: data.get("vomitingFrequencyPer24h")
        ? Number(data.get("vomitingFrequencyPer24h"))
        : null,
      nonProductiveRetching: data.get("nonProductiveRetching") === "true",
      hasDiarrhea: data.get("hasDiarrhea") === "true",
      diarrheaWithBlood: data.get("diarrheaWithBlood") === "true",
      unableToKeepWaterDown: data.get("unableToKeepWaterDown") === "true",
      abdomenDistended: data.get("abdomenDistended") === "true",

      strainingToUrinate: data.get("strainingToUrinate") === "true",
      unableToUrinate: data.get("unableToUrinate") === "true",

      eyeInjury: data.get("eyeInjury") === "true",
      eyeBulgingOrPainful: data.get("eyeBulgingOrPainful") === "true",

      pregnantAndStraining: data.get("pregnantAndStraining") === "true",
      unproductiveLabor: data.get("unproductiveLabor") === "true",

      puppyOrKittenUnder16Weeks: data.get("puppyOrKittenUnder16Weeks") === "true",
      seniorPet: data.get("seniorPet") === "true",
      fever: data.get("fever") === "true",
      lethargy: data.get("lethargy") === "true",
      weakness: data.get("weakness") === "true",

      photos: [],
    };

    setIntake(answers);
    setStep("review");
    setLoading(false);
  }

  async function bookConsult() {
    setLoading(true);
    setError(null);
    try {
      const body: any = {
        petId: params.id,
        type: consultType,
        intakeAnswers: intake,
      };

      // For on-demand, try to match a vet first
      if (consultType === "ON_DEMAND") {
        const matchRes = await fetch("/api/vet/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ specialty: intake.specialty }),
        });
        const matchData = await matchRes.json();
        setMatchResult(matchData);

        if (!matchData.matched) {
          setError(matchData.message || "No vet available right now. Please try scheduling instead.");
          setLoading(false);
          return;
        }

        // Include matched vet in the booking
        body.vetId = matchData.vet.id;
        body.waitEstimateMinutes = matchData.waitEstimateMinutes;
      }

      const res = await fetch("/api/owner/consults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (res.status === 409 && result.emergencyInterrupt) {
        setEmergency(result as EmergencyResult);
        setStep("intake");
        return;
      }

      if (!res.ok) {
        throw new Error(result.error || "Failed to book consult");
      }

      setConsultId(result.consultId);
      setPaymentId(result.paymentId);

      // On-demand: redirect to waiting room; Scheduled: go to checkout
      if (consultType === "ON_DEMAND") {
        router.push(`/waiting-room?consultId=${result.consultId}`);
      } else {
        setStep("checkout");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!pet) {
    return (
      <div className="min-h-screen">
        <HeaderNav />
        <main className="container mx-auto px-4 py-8">
          <p>Pet not found. <Link href="/owner/pets" className="text-brand">Go back to pets</Link></p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <HeaderNav />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/owner/pets" className="text-sm text-muted-foreground hover:text-brand">Pets</Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">{pet.name}</span>
          </div>

<h2 className="text-xl font-bold mb-2">
              {consultType === "ON_DEMAND" ? "On-Demand Consult" : "Schedule a Consult"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {consultType === "ON_DEMAND"
                ? "We'll match you with an available licensed vet immediately after payment."
                : "₦9,800 flat rate • 20-min consult • Licensed vet within your jurisdiction"}
            </p>

          {/* EMERGENCY INTERRUPT */}
          {emergency && emergency.emergencyInterrupt && (
            <div className="mb-6 rounded-lg border-2 border-emergency bg-red-50 p-6 text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <h2 className="text-xl font-bold text-emergency mb-2">Emergenc<i className="sr-only">y</i>y — Seek Care Now</h2>
              <p className="mb-4">{emergency.triage.recommendation}</p>
              <p className="text-sm mb-4">
                This symptom requires immediate in-person care. We cannot proceed with a video consult.
              </p>
              <Link
                href={`https://www.google.com/maps/search/?api=1&query=24+hour+emergency+vet+${encodeURIComponent(pet.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-md bg-emergency px-6 py-3 font-medium text-emergency-foreground hover:bg-emergency/90"
              >
                Find Nearby Emergency Vet
              </Link>
            </div>
          )}

          {!emergency && (
            <>
              {step === "type" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold">Choose Consult Type</h2>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-border bg-background p-4 hover:border-brand">
                      <input
                        type="radio"
                        name="consultType"
                        value="SCHEDULED"
                        checked={consultType === "SCHEDULED"}
                        onChange={() => setConsultType("SCHEDULED")}
                        className="mt-1 h-4 w-4 text-brand"
                      />
                      <div>
                        <strong>Schedule a Consult</strong>
                        <p className="text-sm text-muted-foreground">Pick a time that works for you. ₦9,800 flat rate.</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-border bg-background p-4 hover:border-brand">
                      <input
                        type="radio"
                        name="consultType"
                        value="ON_DEMAND"
                        checked={consultType === "ON_DEMAND"}
                        onChange={() => setConsultType("ON_DEMAND")}
                        className="mt-1 h-4 w-4 text-brand"
                      />
                      <div>
                        <strong>On-Demand Consult</strong>
                        <p className="text-sm text-muted-foreground">Connect with a licensed vet now. We'll match you with an available vet.</p>
                      </div>
                    </label>
                  </div>
                  <button
                    onClick={() => setStep("intake")}
                    className="w-full rounded-md bg-brand py-3 font-medium text-brand-foreground hover:bg-brand/90"
                  >
                    Continue
                  </button>
                </div>
              )}

              {step === "intake" && (
                <form onSubmit={submitIntake} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">What symptom are you concerned about?</label>
                    <select name="symptomCategory" required className="w-full rounded-md border border-border bg-background px-3 py-2">
                      <option value="">Select a category</option>
                      <option value="GI">Stomach / Digestion</option>
                      <option value="DERMATOLOGICAL">Skin / Coat</option>
                      <option value="ORTHOPEDIC">Bone / Mobility</option>
                      <option value="RESPIRATORY">Breathing / Lungs</option>
                      <option value="URINARY">Urination / Bladder</option>
                      <option value="OCULAR">Eyes</option>
                      <option value="BEHAVIORAL">Behavior</option>
                      <option value="DENTAL">Dental / Mouth</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Primary symptom</label>
                    <input name="primarySymptom" type="text" placeholder="e.g. Vomiting, limping, lethargy" required className="w-full rounded-md border border-border bg-background px-3 py-2" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Onset</label>
                    <select name="onset" required className="w-full rounded-md border border-border bg-background px-3 py-2">
                      <option value="sudden">Sudden (within hours)</option>
                      <option value="gradual">Gradual (days/weeks)</option>
                      <option value="unknown">Not sure</option>
                    </select>
                  </div>

                  <hr className="border-border" />
                  <p className="text-xs text-muted-foreground">Answer the questions below so we can triage your pet's symptoms:</p>

                  <div className="space-y-3">
                    <CheckPair name="vomiting" label="Is your pet vomiting?" />
                    <div className="ml-6">
                      <label className="block text-sm font-medium mb-1">Vomiting frequency (per 24h)</label>
                      <input name="vomitingFrequencyPer24h" type="number" min="1" max="20" className="w-full rounded-md border border-border bg-background px-3 py-2" />
                    </div>
                    <CheckPair name="nonProductiveRetching" label="Non-productive retching (trying to vomit but nothing comes up)?" />
                    <CheckPair name="hasDiarrhea" label="Diarrhea?" />
                    <CheckPair name="diarrheaWithBlood" label="Blood in diarrhea?" />
                    <CheckPair name="unableToKeepWaterDown" label="Unable to keep water down?" />
                    <CheckPair name="abdomenDistended" label="Abdomen appears distended or swollen?" />
                  </div>

                  <div className="space-y-3">
                    <CheckPair name="difficultyBreathing" label="Difficulty breathing / open-mouth breathing?" />
                    <CheckPair name="blueOrPaleGums" label="Blue, pale, or white gums?" />
                    <CheckPair name="collapsed" label="Collapsed or unable to stand?" />
                    <CheckPair name="unresponsive" label="Unresponsive or overly weak?" />
                    <CheckPair name="seizures" label="Seizures or convulsions?" />
                    <CheckPair name="bleeding" label="Bleeding?" />
                    <CheckPair name="bleedingUncontrollable" label="Bleeding that won't stop with pressure?" />
                    <CheckPair name="hitByCar" label="Hit by car or severe trauma?" />
                    <CheckPair name="severePain" label="Signs of severe pain (whining, rigid posture)?" />
                  </div>

                  <div className="space-y-3">
                    <CheckPair name="toxinExposure" label="Possible toxin exposure (chocolate, xylitol, plants, etc.)?" />
                    <div className="ml-6">
                      <input name="toxinType" type="text" placeholder="Describe what they may have ingested" className="w-full rounded-md border border-border bg-background px-3 py-2" />
                    </div>
                    <CheckPair name="strainingToUrinate" label="Straining to urinate?" />
                    <CheckPair name="unableToUrinate" label="Unable to urinate at all?" />
                    <CheckPair name="eyeInjury" label="Eye injury or squinting?" />
                    <CheckPair name="eyeBulgingOrPainful" label="Bulging or painful eyes?" />
                  </div>

                  <div className="space-y-3">
                    <CheckPair name="pregnantAndStraining" label="Pregnant and straining?" />
                    <CheckPair name="unproductiveLabor" label="Straining without producing puppies/kittens?" />
                    <CheckPair name="puppyOrKittenUnder16Weeks" label="Pet is under 16 weeks old?" />
                    <CheckPair name="seniorPet" label="Senior pet (7+ years)?" />
                    <CheckPair name="fever" label="Noticeable fever or hot ears/nose?" />
                    <CheckPair name="lethargy" label="Lethargic / lacking energy?" />
                    <CheckPair name="weakness" label="Weak / difficulty walking?" />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-md bg-brand py-3 font-medium text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
                  >
                    {loading ? "Checking..." : "Continue to Review"}
                  </button>
                </form>
              )}

              {step === "review" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold">Review & Book</h2>
                  <div className="rounded-lg border border-border bg-muted p-4">
                    <p><strong>Pet:</strong> {pet.name} ({pet.species})</p>
                    <p><strong>Type:</strong> {consultType === "ON_DEMAND" ? "On-Demand (immediate)" : "Scheduled"}</p>
                    <p><strong>Price:</strong> ₦9,800.00 NGN</p>
                    {matchResult && !matchResult.matched && (
                      <p className="text-sm text-red-600 mt-2">{matchResult.message}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">
                      By booking, you acknowledge that video vet advice is for triage only and is not a substitute for an in-person physical examination.
                    </p>
                  </div>
                  <button
                    onClick={bookConsult}
                    disabled={loading}
                    className="w-full rounded-md bg-brand py-3 font-medium text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
                  >
                    {loading ? "Processing..." : "Pay & Book Consultation"}
                  </button>
                  <button
                    onClick={() => setStep("intake")}
                    className="w-full rounded-md border border-border py-3 hover:bg-muted"
                  >
                    Back
                  </button>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
              )}

              {step === "checkout" && consultId && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">✅</div>
                  <h2 className="text-xl font-bold mb-2">Consult Booked!</h2>
                  <p className="text-muted-foreground mb-4">
                    Your consult has been created. Proceed to payment to lock in your spot.
                  </p>
                  <Link
                    href={`/owner/checkout?paymentId=${paymentId}`}
                    className="inline-block rounded-md bg-brand px-6 py-3 font-medium text-brand-foreground hover:bg-brand/90"
                  >
                    Complete Payment
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function CheckPair({ name, label }: { name: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        name={name}
        value="true"
        className="h-4 w-4 rounded border-border text-brand"
      />
      <label className="text-sm">{label}</label>
    </div>
  );
}
