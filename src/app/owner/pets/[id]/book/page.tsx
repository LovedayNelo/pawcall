import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import BookConsultForm from "./BookConsultForm";

export default async function BookConsultPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.userId) notFound();

  const { id } = await params;
  const pet = await prisma.pet.findFirst({
    where: { id, ownerId: session.userId, deletedAt: null },
  });
  if (!pet) notFound();

  return <BookConsultForm params={{ id }} pet={pet} />;
}