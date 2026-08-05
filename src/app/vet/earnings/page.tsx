import HeaderNav from "@/components/HeaderNav";

export default function VetEarningsPage() {
  return (
    <div className="min-h-screen">
      <HeaderNav />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Earnings</h1>
        <p className="text-muted-foreground">
          Payout reporting is under construction. Completed consults will appear
          here with earnings and scheduled payouts.
        </p>
      </main>
    </div>
  );
}
