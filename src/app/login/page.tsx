"use client";

import Link from "next/link";
import { use, useState } from "react";
import { loginAction, signupAction } from "@/app/actions/auth";

export default function LoginPage({ searchParams }: { searchParams: Promise<{ role?: string; redirect?: string }> }) {
  const sp = use(searchParams);
  const role = (sp.role ?? "OWNER") as "OWNER" | "VET";
  const redirect = sp.redirect ?? (role === "VET" ? "/vet/onboarding" : "/owner/pets");
  const [isLogin, setIsLogin] = useState(true);
  const [state, setState] = useState<{ errors?: Record<string, string[]>; message?: string } | undefined>();

  const action = isLogin ? loginAction : signupAction;

  return (
    <div className="min-h-screen flex items-center justify-center container mx-auto px-4">
      <form
        action={async (formData) => {
          const result = await action(state, formData);
          setState(result);
        }}
        className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 shadow"
      >
        <h1 className="text-2xl font-bold text-center">
          {isLogin ? "Sign in" : "Create your account"}
        </h1>

        <div className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input name="name" type="text" required className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2" />
              {state?.errors?.name && <p className="text-xs text-red-600">{state.errors.name[0]}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium">Email</label>
            <input name="email" type="email" required className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2" />
            {state?.errors?.email && <p className="text-xs text-red-600">{state.errors.email.join(", ")}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium">Password</label>
            <input name="password" type="password" required minLength={8} className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2" />
            {state?.errors?.password && <p className="text-xs text-red-600">{state.errors.password.join(", ")}</p>}
          </div>

          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="redirect" value={redirect} />
          {state?.message && <p className="text-sm text-muted-foreground">{state.message}</p>}
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-brand py-2 font-medium text-brand-foreground hover:bg-brand/90"
        >
          {isLogin ? "Sign in" : "Create account"}
        </button>

        <p className="text-center text-sm">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="ml-1 text-brand hover:underline"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>
        <p className="text-center text-xs text-muted-foreground">
          By signing up, you agree to our{" "}
          <Link href="/legal" className="underline">Terms</Link> and{" "}
          <Link href="/legal" className="underline">Privacy Policy</Link>.
          Video vet advice is for triage only, not a substitute for an in-person exam.
        </p>
      </form>
    </div>
  );
}