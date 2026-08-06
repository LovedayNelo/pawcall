"use server";

import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getTenantContext } from "@/lib/tenant/context";
import type { Role, User } from "@/generated/prisma/tenant/client";

async function getPrisma() {
  const { tenantPrisma } = await getTenantContext();
  if (!tenantPrisma) {
    throw new Error("No tenant context available");
  }
  return tenantPrisma;
}

export const verifySession = cache(async (): Promise<{ isAuth: true; userId: string; role: Role; email: string }> => {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }
  return { isAuth: true, userId: session.userId, role: session.role as Role, email: session.email };
});

export const getUser = cache(async (): Promise<User | null> => {
  const session = await verifySession();
  const prisma = await getPrisma();
  return prisma.user.findUnique({ where: { id: session.userId } });
});

export const requireRole = async (...allowedRoles: Role[]): Promise<{ userId: string; role: Role }> => {
  const session = await verifySession();
  if (!allowedRoles.includes(session.role)) {
    throw new Error(`Access denied: required role ${allowedRoles.join(" or ")}`);
  }
  return { userId: session.userId, role: session.role };
};

export async function requireOwner() {
  return requireRole("OWNER");
}
export async function requireVet() {
  return requireRole("VET");
}
export async function requireAdmin() {
  return requireRole("ADMIN");
}
export async function requireVetOrAdmin() {
  return requireRole("VET", "ADMIN");
}

export async function getTenantPrismaClient() {
  return getPrisma();
}