import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { platformPrisma, createTenantDatabase, runTenantMigrations, getTenantPrisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const maxDuration = 120;

const createTenantSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers and dashes"),
  subdomain: z
    .string()
    .min(3)
    .max(63)
    .regex(/^[a-z0-9-]+$/, "Subdomain may only contain lowercase letters, numbers and dashes"),
  contactEmail: z.string().email(),
  contactPhone: z.string().max(30).optional(),
  adminName: z.string().min(2).max(100),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8).max(100),
  country: z.string().max(2).default("NG"),
  city: z.string().max(100).optional(),
  timezone: z.string().max(64).default("Africa/Lagos"),
  currency: z.string().max(3).default("NGN"),
  plan: z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE", "CUSTOM"]).default("STARTER"),
  databaseName: z
    .string()
    .regex(/^[a-z][a-z0-9_]*$/, "Database name may only contain lowercase letters, numbers and underscores")
    .optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createTenantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;
  const databaseName = data.databaseName ?? `pawscall_${data.slug.replace(/-/g, "_")}`;

  const existing = await platformPrisma.tenant.findFirst({
    where: {
      OR: [{ slug: data.slug }, { subdomain: data.subdomain }, { databaseName }],
    },
    select: { slug: true, subdomain: true, databaseName: true },
  });
  if (existing) {
    const conflict =
      existing.slug === data.slug ? "slug"
      : existing.subdomain === data.subdomain ? "subdomain"
      : "databaseName";
    return NextResponse.json({ error: `${conflict} is already in use` }, { status: 409 });
  }

  const adminPoolUrl = process.env.PLATFORM_DATABASE_URL || "";
  const baseUrl = adminPoolUrl.replace(/\/[^/]+$/, "");
  const databaseUrl = `${baseUrl}/${databaseName}?schema=public`;

  let created = false;
  try {
    created = await createTenantDatabase(databaseUrl, databaseName);
    await runTenantMigrations(databaseUrl);
  } catch (err) {
    if (created) {
      await clearTenantDatabase(databaseUrl, databaseName);
    }
    console.error("Tenant provisioning failed:", err);
    return NextResponse.json({ error: "Failed to provision tenant database" }, { status: 500 });
  }

  const tenant = await platformPrisma.tenant.create({
    data: {
      name: data.name,
      slug: data.slug,
      subdomain: data.subdomain,
      status: "TRIAL",
      plan: data.plan,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      country: data.country,
      city: data.city,
      timezone: data.timezone,
      currency: data.currency,
      databaseUrl,
      databaseName,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  try {
    const tenantPrisma = getTenantPrisma(databaseUrl);
    const passwordHash = await bcrypt.hash(data.adminPassword, 12);
    await tenantPrisma.user.create({
      data: {
        name: data.adminName,
        email: data.adminEmail,
        passwordHash,
        role: "ADMIN",
        countryCode: data.country,
        emailVerifiedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("Failed to create tenant admin user:", err);
    return NextResponse.json(
      { error: "Tenant provisioned but admin account creation failed", tenantId: tenant.id },
      { status: 500 },
    );
  }

  await platformPrisma.tenantAuditLog.create({
    data: {
      tenantId: tenant.id,
      action: "TENANT_CREATED",
      entityType: "Tenant",
      entityId: tenant.id,
      details: { name: data.name, subdomain: data.subdomain },
    },
  });

  return NextResponse.json(
    {
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        subdomain: tenant.subdomain,
        status: tenant.status,
      },
    },
    { status: 201 },
  );
}

async function clearTenantDatabase(databaseUrl: string, databaseName: string): Promise<void> {
  const { Pool } = await import("pg");
  const adminUrl = databaseUrl.replace(/\/[^/]+$/, "/postgres");
  const pool = new Pool({ connectionString: adminUrl });
  try {
    await pool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  } finally {
    await pool.end();
  }
}
