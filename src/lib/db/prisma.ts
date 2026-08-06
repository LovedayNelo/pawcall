import { PrismaClient as PlatformPrismaClient } from "@/generated/prisma/platform/client";
import { PrismaClient as TenantPrismaClient } from "@/generated/prisma/tenant/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const platformPool = new Pool({ connectionString: process.env.PLATFORM_DATABASE_URL });
const platformAdapter = new PrismaPg(platformPool);
export const platformPrisma = new PlatformPrismaClient({ adapter: platformAdapter });

function createTenantClient(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  return new TenantPrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

interface TenantClientCache {
  [databaseUrl: string]: TenantPrismaClient;
}

const tenantClientCache: TenantClientCache = {};

export function getTenantPrisma(databaseUrl: string): TenantPrismaClient {
  if (!tenantClientCache[databaseUrl]) {
    tenantClientCache[databaseUrl] = createTenantClient(databaseUrl);
  }
  return tenantClientCache[databaseUrl];
}

export function clearTenantPrismaCache(databaseUrl?: string) {
  if (databaseUrl) {
    if (tenantClientCache[databaseUrl]) {
      tenantClientCache[databaseUrl].$disconnect();
      delete tenantClientCache[databaseUrl];
    }
  } else {
    for (const client of Object.values(tenantClientCache)) {
      client.$disconnect();
    }
    Object.keys(tenantClientCache).forEach((key) => delete tenantClientCache[key]);
  }
}

export async function createTenantDatabase(databaseUrl: string, databaseName: string): Promise<boolean> {
  const adminUrl = databaseUrl.replace(/\/[^/]+$/, "/postgres");
  const adminPool = new Pool({ connectionString: adminUrl });
  
  try {
    const exists = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [databaseName],
    );
    if (exists.rowCount && exists.rowCount > 0) {
      return false;
    }
    await adminPool.query(`CREATE DATABASE "${databaseName}"`);
    return true;
  } finally {
    await adminPool.end();
  }
}

export async function runTenantMigrations(databaseUrl: string): Promise<void> {
  const { execSync } = await import("child_process");
  execSync(`DATABASE_URL="${databaseUrl}" npx prisma migrate deploy --schema=prisma/tenant.schema.prisma`, {
    stdio: "inherit",
    cwd: process.cwd(),
  });
}

export async function closeTenantPools(): Promise<void> {
  for (const client of Object.values(tenantClientCache)) {
    await client.$disconnect();
  }
}

export async function closePlatformPool(): Promise<void> {
  await platformPool.end();
  await platformPrisma.$disconnect();
}