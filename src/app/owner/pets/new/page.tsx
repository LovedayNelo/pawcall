"use client";

import HeaderNav from "@/components/HeaderNav";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewPetPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    const body = {
      name: data.get("name")?.toString(),
      species: data.get("species")?.toString(),
      breed: data.get("breed")?.toString() || null,
      birthDate: data.get("birthDate") ? new Date(data.get("birthDate")!.toString()).toISOString() : null,
      sex: data.get("sex")?.toString() || null,
      spayedNeutered: data.get("spayedNeutered") === "true",
      weightKg: data.get("weightKg") ? Number(data.get("weightKg")) : null,
      allergies: data.get("allergies")?.toString().split(",").map((s) => s.trim()).filter(Boolean) ?? [],
      chronicConditions: data.get("chronicConditions")?.toString().split(",").map((s) => s.trim()).filter(Boolean) ?? [],
      medications: data.get("medications")?.toString().split(",").map((s) => s.trim()).filter(Boolean) ?? [],
      vaccinationHistory: data.get("vaccinationHistory")?.toString().split(",").map((s) => s.trim()).filter(Boolean) ?? [],
      photoUrl: data.get("photoUrl")?.toString() || null,
    };

    try {
      const res = await fetch("/api/owner/pets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create pet");
      }
      const pet = await res.json();
      router.push(`/owner/pets/${pet.id}/book`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <HeaderNav />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Add a Pet</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Pet Name</label>
              <input name="name" type="text" required className="w-full rounded-md border border-border bg-background px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Species</label>
              <select name="species" required className="w-full rounded-md border border-border bg-background px-3 py-2">
                <option value="">Select...</option>
                <option value="DOG">Dog</option>
                <option value="CAT">Cat</option>
                <option value="BIRD">Bird</option>
                <option value="REPTILE">Reptile</option>
                <option value="SMALL_MAMMAL">Small Mammal</option>
                <option value="RABBIT">Rabbit</option>
                <option value="FERRET">Ferret</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Breed</label>
              <input name="breed" type="text" placeholder="e.g. Golden Retriever" className="w-full rounded-md border border-border bg-background px-3 py-2" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date of Birth</label>
                <input name="birthDate" type="date" className="w-full rounded-md border border-border bg-background px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sex</label>
                <select name="sex" className="w-full rounded-md border border-border bg-background px-3 py-2">
                  <option value="">Unknown</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Weight (kg)</label>
                <input name="weightKg" type="number" step="0.1" className="w-full rounded-md border border-border bg-background px-3 py-2" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="spayedNeutered" value="true" className="rounded" />
                  Spayed/Neutered
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Allergies (comma separated)</label>
              <input name="allergies" type="text" placeholder="e.g. chicken, beef" className="w-full rounded-md border border-border bg-background px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Chronic Conditions (comma separated)</label>
              <input name="chronicConditions" type="text" placeholder="e.g. diabetes, arthritis" className="w-full rounded-md border border-border bg-background px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Current Medications (comma separated)</label>
              <input name="medications" type="text" className="w-full rounded-md border border-border bg-background px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Vaccination History (comma separated)</label>
              <input name="vaccinationHistory" type="text" className="w-full rounded-md border border-border bg-background px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Photo URL (optional)</label>
              <input name="photoUrl" type="url" placeholder="https://..." className="w-full rounded-md border border-border bg-background px-3 py-2" />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-brand px-6 py-2 font-medium text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Pet"}
              </button>
              <Link href="/owner/pets" className="rounded-md border border-border px-6 py-2 hover:bg-muted">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}