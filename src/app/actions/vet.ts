"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function startConsult(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session?.userId || session.role !== "VET") return;

  const consultId = formData.get("consultId")?.toString();
  if (!consultId) return;

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
  const session = await getSession();
  if (!session?.userId || session.role !== "VET") return;

  const enable = formData.get("enable")?.toString() === "true";

  await prisma.vetProfile.update({
    where: { userId: session.userId },
    data: { isOnline: enable },
  });

  revalidatePath("/vet/dashboard");
}