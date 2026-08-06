"use client";

import HeaderNav from "@/components/HeaderNav";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ConsultStatus {
  id: string;
  status: string;
  waitEstimateMinutes: number | null;
  vet: { id: string; name: string } | null;
}

export default function WaitingRoomPage({
  searchParams,
}: {
  searchParams: Promise<{ consultId?: string }>;
}) {
  const router = useRouter();
  const [params, setParams] = useState<{ consultId?: string }>({});
  const [consult, setConsult] = useState<ConsultStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    searchParams.then(setParams);
  }, [searchParams]);

  useEffect(() => {
    if (!params.consultId) return;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/consults/${params.consultId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch");
        setConsult(data.consult);

        // Redirect when consult starts
        if (data.consult.status === "IN_PROGRESS") {
          router.push(`/consult/${params.consultId}/call`);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    };

    fetchStatus();
    if (params.consultId && consult?.status === "QUEUED" || consult?.status === "QUEUED") {
      const interval = setInterval(fetchStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [params, consult?.status, router]);

  if (!params.consultId) {
    return (
      <div className="min-h-screen">
        <HeaderNav />
        <main className="container mx-auto px-4 py-8">
          <p>Missing consult ID. <a href="/owner/pets" className="text-brand">Go to pets</a></p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <HeaderNav />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-8">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Joining a Licensed Vet</h1>
            {consult && (
              <p className="text-muted-foreground mb-4">
                {consult.vet
                  ? `Assigned to Dr. ${consult.vet.name}`
                  : "Looking for an available licensed vet..."}
              </p>
            )}
          </div>

          {consult?.waitEstimateMinutes && (
            <div className="rounded-lg border border-border bg-card p-6 mb-6">
              <p className="text-sm text-muted-foreground">Estimated wait time</p>
              <p className="text-3xl font-bold text-brand">{consult.waitEstimateMinutes} min</p>
            </div>
          )}

          <div className="rounded-lg border border-border bg-card p-6 mb-6">
            <p className="text-sm text-muted-foreground mb-4">
              You are in the queue. A licensed veterinarian will join your video call shortly.
              Please keep your pet nearby and your camera/microphone ready.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-muted-foreground">Waiting room active</span>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <p className="mt-4 text-xs text-muted-foreground">
            In case of emergency, call your nearest 24-hour veterinary hospital immediately.
          </p>
        </div>
      </main>
    </div>
  );
}
