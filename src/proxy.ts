import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/auth/session";
import { isPlatformDomain, resolveTenantFromHost } from "@/lib/tenant/context";

const protectedRoutes = [
  "/owner",
  "/vet",
  "/admin",
  "/api/owner",
  "/api/vet",
  "/api/admin",
];

const vetOnlyRoutes = ["/vet", "/api/vet"];
const adminOnlyRoutes = ["/admin", "/api/admin"];
const ownerOnlyRoutes = ["/owner", "/api/owner"];

export async function proxy(req: NextRequest) {
  const host = req.headers.get("host") || "";

  if (isPlatformDomain(host)) {
    return NextResponse.next();
  }

  const tenant = await resolveTenantFromHost(host);

  if (!tenant) {
    const url = new URL("/", req.nextUrl);
    return NextResponse.redirect(url);
  }

  if (tenant.status !== "ACTIVE" && tenant.status !== "TRIAL") {
    return new NextResponse("Tenant not active", { status: 503 });
  }

  const path = req.nextUrl.pathname;
  const isProtected = protectedRoutes.some((r) => path.startsWith(r));

  if (!isProtected) return NextResponse.next();

  const cookie = req.cookies.get("pawscall_session")?.value;
  const session = await decrypt(cookie);

  if (!session?.userId) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.role as "OWNER" | "VET" | "ADMIN" | "TECH" | "PARTNER_CLINIC";

  if (vetOnlyRoutes.some((r) => path.startsWith(r)) && !["VET", "ADMIN"].includes(role)) {
    return NextResponse.redirect(new URL("/unauthorized", req.nextUrl));
  }
  if (adminOnlyRoutes.some((r) => path.startsWith(r)) && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", req.nextUrl));
  }
  if (ownerOnlyRoutes.some((r) => path.startsWith(r)) && !["OWNER", "ADMIN"].includes(role)) {
    return NextResponse.redirect(new URL("/unauthorized", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|.*\\.png$|.*\\.svg$|.*\\.ico$|.*\\.woff2?$).*)",
  ],
};
