import HeaderNav from "@/components/HeaderNav";
import { getTenantContext } from "@/lib/tenant/context";
import { getSession } from "@/lib/auth/session";
import Link from "next/link";
import Image from "next/image";

async function OwnerPetsData() {
  const session = await getSession();
  if (!session?.userId) {
    return (
      <div className="text-center py-12">
        <p className="mb-4">You need to sign in to view your pets.</p>
        <Link href="/login?role=OWNER" className="text-brand font-medium">Sign in</Link>
      </div>
    );
  }

  const { tenantPrisma: prisma } = await getTenantContext();
  if (!prisma) return null;

  const pets = await prisma.pet.findMany({
    where: { ownerId: session.userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      {pets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No pets yet. Add your first pet to start booking consults.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => (
            <Link
              key={pet.id}
              href={`/owner/pets/${pet.id}/book`}
              className="block rounded-lg border border-border bg-card p-4 hover:border-brand/50"
            >
              <div className="flex items-center gap-3">
                {pet.photoUrl ? (
                  <Image src={pet.photoUrl} alt={pet.name} width={64} height={64} unoptimized className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-2xl">🐾</div>
                )}
                <div>
                  <h3 className="font-bold">{pet.name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{pet.species.toLowerCase()}{pet.breed ? `, ${pet.breed}` : ""}</p>
                  <p className="text-sm text-muted-foreground">{pet.weightKg ? `${pet.weightKg} kg` : ""}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export default async function OwnerPetsPage() {
  return (
    <div className="min-h-screen">
      <HeaderNav />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Your Pets</h1>
          <Link
            href="/owner/pets/new"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand/90"
          >
            Add Pet
          </Link>
        </div>
        <OwnerPetsData />
      </main>
    </div>
  );
}