"use server";

import { getTenantPrismaClient, requireVet } from "@/lib/auth/dal";
import { revalidatePath } from "next/cache";

export async function startConsult(formData: FormData): Promise<void> {
  await requireVet();
  const session = await (await import("@/lib/auth/session")).getSession();
  if (!session?.userId) return;

  const consultId = formData.get("consultId")?.toString();
  if (!consultId) return;

  const prisma = await getTenantPrismaClient();
  const consult = await prisma.consult.findUnique({ where: { id: consultId } });
  if (!consult) return;
  if (consult.vetId && consult.vetId !== session.userId) return;

  await prisma.consult.update({
    where: { id: consultId },
    data: {
      status: "IN_PROGRESS",
      startedAt: new Date(),
      vetId: session.userId,
    },
  });

  revalidatePath("/vet/dashboard");
}

export async function setOnline(formData: FormData): Promise<void> {
  await requireVet();
  const session = await (await import("@/lib/auth/session")).getSession();
  if (!session?.userId) return;

  const enable = formData.get("enable")?.toString() === "true";

  const prisma = await getTenantPrismaClient();
  await prisma.vetProfile.update({
    where: { userId: session.userId },
    data: { isOnline: enable },
  });

  revalidatePath("/vet/dashboard");
}