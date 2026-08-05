"use client";

import HeaderNav from "@/components/HeaderNav";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatKobo } from "@/lib/formatCurrency";

interface PaymentDetails {
  paymentId: string;
  amountCents: number;
  currency: string;
  consult: { id: string };
  stripePublishableKey?: string;
  clientSecret?: string;
}

export default function CheckoutPage({ searchParams }: { searchParams: Promise<{ paymentId?: string }> }) {
  const router = useRouter();
  const [params, setParams] = useState<{ paymentId?: string }>({});
  const [details, setDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);
  const cardRef = useRef<any>(null);

  useEffect(() => {
    searchParams.then(setParams);
  }, [searchParams]);

  useEffect(() => {
    if (params.paymentId) {
      fetch(`/api/owner/checkout?paymentId=${params.paymentId}`)
        .then((r) => r.json())
        .then(setDetails)
        .catch((e) => setError(e.message));
    }
  }, [params]);

  // Load Stripe.js when we have the publishable key + client_secret
  useEffect(() => {
    if (details?.stripePublishableKey && details?.clientSecret && !details.clientSecret.startsWith("pi_mock")) {
      const loadStripe = async () => {
        const { loadStripe } = await import("@stripe/stripe-js");
        stripeRef.current = await loadStripe(details.stripePublishableKey!);
        if (stripeRef.current && details.clientSecret) {
          elementsRef.current = stripeRef.current.elements({ clientSecret: details.clientSecret });
          cardRef.current = elementsRef.current.create("cardElement");
          const container = document.getElementById("card-element");
          if (container) {
            cardRef.current.mount(container);
            cardRef.current.on("error", (e: any) => setError(e.message));
            cardRef.current.on("change", (e: any) => {
              if (e.error) setError(e.error.message);
              else setError(null);
            });
          }
        }
      };
      loadStripe();
    }
    return () => {
      if (cardRef.current) cardRef.current.unmount();
    };
  }, [details]);

  async function handlePayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!params.paymentId) return;
    setLoading(true);
    setError(null);
    try {
      // Dev / mock path — no real card needed
      if (!details?.clientSecret || details.clientSecret.startsWith("pi_mock_")) {
        const res = await fetch("/api/owner/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId: params.paymentId,
            paymentMethodId: "pm_card_mock",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Payment failed");
        router.push(`/consult/${data.consultId}?paid=true`);
        return;
      }

      // Real Stripe path
      if (!stripeRef.current || !cardRef.current) {
        throw new Error("Stripe not loaded");
      }
      const { error: stripeError, paymentIntent } = await stripeRef.current.confirmCardPayment(
        details.clientSecret,
        { payment_method: { card: cardRef.current } },
      );
      if (stripeError) throw stripeError;

      // Confirm on the server side to capture funds
      const confirm = await stripeRef.current.paymentIntents?.retrieve?.(paymentIntent.id);

      const res = await fetch("/api/owner/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: params.paymentId,
          paymentMethodId: paymentIntent.payment_method,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed");
      router.push(`/consult/${data.consultId}?paid=true`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!params.paymentId) {
    return (
      <div className="min-h-screen">
        <HeaderNav />
        <main className="container mx-auto px-4 py-8">
          <p>Missing payment ID. <a href="/owner/pets" className="text-brand">Go to pets</a></p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <HeaderNav />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-6">Complete Payment</h1>
          {details && (
            <div className="border border-border rounded-lg p-4 mb-6">
              <p>Amount: {formatKobo(details.amountCents)} {details.currency}</p>
              <p className="text-sm text-muted-foreground">Consult #{details.consult.id.slice(-6)}</p>
            </div>
          )}

          <form onSubmit={handlePayment} className="space-y-4">
            <div>
              {details?.clientSecret && !details.clientSecret.startsWith("pi_mock_") ? (
                <div id="card-element" className="border border-border rounded-md p-3 bg-background" />
              ) : (
                <div className="border border-dashed border-border rounded-md p-4 text-center text-sm text-muted-foreground">
                  Test mode — mock card on file (4242 4242 4242 4242)
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !details}
              className="w-full rounded-md bg-brand py-3 font-medium text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Pay Now"}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>

          <p className="mt-4 text-xs text-muted-foreground">
            Powered by Stripe.
          </p>
        </div>
      </main>
    </div>
  );
}
