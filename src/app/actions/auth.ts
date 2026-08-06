"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { getTenantPrismaClient } from "@/lib/auth/dal";
import { createSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

const signupSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).max(100),
  role: z.enum(["OWNER", "VET"]).default("OWNER"),
});

export async function signupAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ errors?: Record<string, string[]>; message?: string }> {
  const validated = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role") || "OWNER",
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { name, email, password, role } = validated.data;

  const prisma = await getTenantPrismaClient();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { errors: { email: ["An account with this email already exists."] } };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  await createSession({ userId: user.id, role: user.role, email: user.email });
  redirect(formData.get("redirect")?.toString() || (role === "VET" ? "/vet/onboarding" : "/owner/pets"));
}

const loginSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(1),
});

export async function loginAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ errors?: Record<string, string[]>; message?: string }> {
  const validated = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email, password } = validated.data;
  const prisma = await getTenantPrismaClient();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) {
    return { errors: { email: ["Invalid email or password."] } };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { errors: { email: ["Invalid email or password."] } };
  }

  await createSession({ userId: user.id, role: user.role, email: user.email });
  redirect(formData.get("redirect")?.toString() || (user.role === "VET" ? "/vet/dashboard" : "/owner/pets"));
}

export async function logoutAction(): Promise<void> {
  const { deleteSession } = await import("@/lib/auth/session");
  await deleteSession();
  redirect("/login");
}