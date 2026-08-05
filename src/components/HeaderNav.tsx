"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface NavUser {
  role: "OWNER" | "VET" | "ADMIN" | null;
}

export default function HeaderNav() {
  const [user, setUser] = useState<NavUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser({ role: d.role ?? null }))
      .catch(() => setUser(null));
  }, []);

  const role = user?.role;
  const dashboardHref =
    role === "VET" ? "/vet/dashboard"
    : role === "ADMIN" ? "/admin/dashboard"
    : "/owner/pets";

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-brand">
          <span role="img" aria-label="paw">🐾</span> PawCall
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/pricing" className="text-sm hover:text-brand">Pricing</Link>
          <Link href="/about" className="text-sm hover:text-brand">About</Link>
          <Link href="/legal" className="text-sm hover:text-brand">Legal</Link>
          {role ? (
            <Link href={dashboardHref} className="text-sm font-medium text-brand hover:text-brand/80">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="text-sm font-medium hover:text-brand">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}