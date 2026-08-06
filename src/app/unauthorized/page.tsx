import HeaderNav from "@/components/HeaderNav";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen">
      <HeaderNav />
      <main className="container mx-auto flex min-h-screen items-center justify-center px-4 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">403 — Access Denied</h1>
          <p className="text-muted-foreground mb-6">You don&apos;t have permission to view this page.</p>
          <Link href="/" className="text-brand hover:underline">Go back home</Link>
        </div>
      </main>
    </div>
  );
}