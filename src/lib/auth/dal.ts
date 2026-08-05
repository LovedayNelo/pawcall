"use server";

import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import type { Role, User } from "@/generated/prisma/client";

export const verifySession = cache(async (): Promise<{ isAuth: true; userId: string; role: Role; email: string }> => {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }
  return { isAuth: true, userId: session.userId, role: session.role as Role, email: session.email };
});

export const getUser = cache(async (): Promise<User | null> => {
  const session = await verifySession();
  return prisma.user.findUnique({ where: { id: session.userId } });
});

export const requireRole = async (...allowedRoles: Role[]): Promise<{ userId: string; role: Role }> => {
  const session = await verifySession();
  if (!allowedRoles.includes(session.role)) {
    throw new Error(`Access denied: required role ${allowedRoles.join(" or ")}`);
  }
  return { userId: session.userId, role: session.role };
};

export const requireOwner = () => requireRole("OWNER");
export const requireVet = () => requireRole("VET");
export const requireAdmin = () => requireRole("ADMIN");
export const requireVetOrAdmin = () => requireRole("VET", "ADMIN");