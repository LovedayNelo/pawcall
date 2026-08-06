"use client";

import { useState } from "react";
import Link from "next/link";
import HeaderNav from "@/components/HeaderNav";

interface SignupState {
  success?: boolean;
  error?: string;
  tenantSubdomain?: string;
}

export default function TenantSignupPage() {
  const [state, setState] = useState<SignupState>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setState({});

    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      slug: form.get("slug"),
      subdomain: form.get("subdomain"),
      contactEmail: form.get("contactEmail"),
      contactPhone: form.get("contactPhone") || undefined,
      adminName: form.get("adminName"),
      adminEmail: form.get("adminEmail"),
      adminPassword: form.get("adminPassword"),
      country: form.get("country") || "NG",
      city: form.get("city") || undefined,
      timezone: form.get("timezone") || "Africa/Lagos",
      currency: form.get("currency") || "NGN",
    };

    try {
      const res = await fetch("/api/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setState({ success: true, tenantSubdomain: data.tenant.subdomain });
      } else {
        setState({ error: data.error ?? "Something went wrong. Please try again." });
      }
    } catch {
      setState({ error: "Network error. Please try again." });
    } finally {
      setPending(false);
    }
  }

  if (state.success) {
    return (
      <div className="min-h-screen">
        <HeaderNav />
        <main className="container mx-auto max-w-lg px-4 py-16">
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <h1 className="text-2xl font-bold mb-2">Clinic created!</h1>
            <p className="text-muted-foreground mb-4">
              Your workspace is being set up at{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
                {state.tenantSubdomain}.{typeof window !== "undefined" ? window.location.hostname : "pawscall.dev"}
              </code>
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Sign in with your admin email and password at your clinic&apos;s subdomain.
            </p>
            <Link href="/" className="inline-block rounded-md bg-brand px-6 py-3 font-medium text-brand-foreground hover:bg-brand/90">
              Back to PawCall
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <HeaderNav />
      <main className="container mx-auto max-w-lg px-4 py-12">
        <h1 className="text-3xl font-bold mb-1">Start your clinic</h1>
        <p className="text-muted-foreground mb-8">
          Create a dedicated PawCall workspace for your veterinary clinic. 14-day free trial, no card required.
        </p>

        {state.error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-border bg-card p-8">
          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold">Clinic details</legend>
            <div>
              <label className="block text-sm font-medium">Clinic name</label>
              <input name="name" type="text" required minLength={2} className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Slug</label>
                <input name="slug" type="text" required pattern="[a-z0-9-]+" placeholder="lagos-pet-clinic" className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium">Subdomain</label>
                <input name="subdomain" type="text" required pattern="[a-z0-9-]+" placeholder="lagospet" className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Contact email</label>
                <input name="contactEmail" type="email" required className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium">Contact phone</label>
                <input name="contactPhone" type="tel" className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium">Country</label>
                <input name="country" type="text" maxLength={2} defaultValue="NG" className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium">City</label>
                <input name="city" type="text" className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium">Timezone</label>
                <input name="timezone" type="text" defaultValue="Africa/Lagos" className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2" />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-lg font-semibold">Admin account</legend>
            <div>
              <label className="block text-sm font-medium">Full name</label>
              <input name="adminName" type="text" required minLength={2} className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input name="adminEmail" type="email" required className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium">Password</label>
              <input name="adminPassword" type="password" required minLength={8} className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2" />
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-brand py-2 font-medium text-brand-foreground hover:bg-brand/90 disabled:opacity-60"
          >
            {pending ? "Creating your clinic..." : "Create clinic"}
          </button>
        </form>
      </main>
    </div>
  );
}
