"use server";

import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export interface SessionPayload {
  userId: string;
  role: string;
  email: string;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

const secretKey = process.env.AUTH_SECRET!;
const encodedKey = new TextEncoder().encode(secretKey);
const COOKIE_NAME = "pawscall_session";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined): Promise<SessionPayload | null> {
  if (!session) return null;
  try {
    const { payload } = await jwtVerify(session, encodedKey, { algorithms: ["HS256"] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const session = await encrypt(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, session, COOKIE_OPTIONS);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME)?.value;
  return decrypt(session);
}

export async function updateSession(): Promise<void> {
  const session = await getSession();
  if (!session) return;
  await createSession(session); // re-sign with fresh expiry
}