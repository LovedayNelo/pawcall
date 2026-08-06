import { headers } from "next/headers";
import { cache } from "react";
import { platformPrisma, getTenantPrisma } from "@/lib/db/prisma";
import type { Tenant } from "@/generated/prisma/platform/client";

export interface TenantContext {
  tenant: Tenant | null;
  tenantPrisma: ReturnType<typeof getTenantPrisma> | null;
  isPlatform: boolean;
}

let explicitlySetContext: TenantContext | null = null;

export function setTenantContext(context: TenantContext) {
  explicitlySetContext = context;
}

/**
 * Resolves the current tenant for the in-flight request and exposes its
 * tenant-scoped Prisma client. Uses React `cache()` so the tenant is resolved
 * exactly once per request, regardless of how many modules call this.
 *
 * NOTE: Proxy/middleware and app code run in separate contexts — never set
 * state in proxy and expect it to be readable here. This function resolves
 * from the request headers instead.
 */
export const getTenantContext = cache(async (): Promise<TenantContext> => {
  if (explicitlySetContext) {
    return explicitlySetContext;
  }

  const tenant = await resolveTenantFromHeaders();
  if (!tenant) {
    return { tenant: null, tenantPrisma: null, isPlatform: false };
  }

  return {
    tenant,
    tenantPrisma: getTenantPrisma(tenant.databaseUrl),
    isPlatform: false,
  };
});

export async function resolveTenantFromHost(host: string): Promise<Tenant | null> {
  const subdomain = extractSubdomain(host);

  if (!subdomain || subdomain === "www" || subdomain === "api" || subdomain === "platform") {
    return null;
  }

  return platformPrisma.tenant.findUnique({
    where: { subdomain },
  });
}

export const resolveTenantFromHeaders = cache(async (): Promise<Tenant | null> => {
  const h = await headers();
  return resolveTenantFromHost(h.get("host") || "");
});

export async function resolveTenantFromSubdomain(subdomain: string): Promise<Tenant | null> {
  if (!subdomain || subdomain === "www" || subdomain === "api" || subdomain === "platform") {
    return null;
  }

  return platformPrisma.tenant.findUnique({
    where: { subdomain },
  });
}

function extractSubdomain(host: string): string | null {
  const hostname = host.split(":")[0];
  const parts = hostname.split(".");

  if (parts.length < 3) return null;

  return parts[0];
}

export function isPlatformDomain(host: string): boolean {
  const hostname = host.split(":")[0];
  const parts = hostname.split(".");
  return parts.length <= 2 || parts[0] === "www" || parts[0] === "api" || parts[0] === "platform";
}
