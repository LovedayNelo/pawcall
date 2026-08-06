import "dotenv/config";
import { platformPrisma } from "@/lib/db/prisma";
import { createTenantDatabase, runTenantMigrations, getTenantPrisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Seeding platform database...");

  // Create demo tenant
  const demoTenant = await platformPrisma.tenant.upsert({
    where: { subdomain: "demo" },
    update: {},
    create: {
      name: "Demo Veterinary Clinic",
      slug: "demo-clinic",
      subdomain: "demo",
      status: "ACTIVE",
      plan: "PROFESSIONAL",
      contactEmail: "demo@pawscall.dev",
      contactPhone: "+1-555-0100",
      city: "Lagos",
      country: "NG",
      timezone: "Africa/Lagos",
      currency: "NGN",
      locale: "en",
      maxVets: 10,
      maxOwners: 500,
      maxConsultsPerMonth: 2000,
      databaseUrl: process.env.DEMO_TENANT_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/pawscall_demo?schema=public",
      databaseName: "pawscall_demo",
    },
  });
  console.log("Created demo tenant:", demoTenant.subdomain);

  // Create demo tenant database
  if (demoTenant.databaseUrl) {
    console.log("Creating demo tenant database...");
    await createTenantDatabase(demoTenant.databaseUrl, demoTenant.databaseName);
    await runTenantMigrations(demoTenant.databaseUrl);
    
    const tenantPrisma = getTenantPrisma(demoTenant.databaseUrl);
    await seedTenantDatabase(tenantPrisma);
  }

  console.log("Seeding complete!");
}

async function seedTenantDatabase(prisma: ReturnType<typeof getTenantPrisma>) {
  console.log("Seeding tenant database...");

  const passwordHash = await bcrypt.hash("password123", 10);

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.pawscall.dev" },
    update: {},
    create: {
      email: "admin@demo.pawscall.dev",
      passwordHash,
      name: "Admin User",
      role: "ADMIN",
      emailVerifiedAt: new Date(),
    },
  });
  console.log("Created admin:", admin.email);

  // Owner user
  const owner = await prisma.user.upsert({
    where: { email: "owner@demo.pawscall.dev" },
    update: {},
    create: {
      email: "owner@demo.pawscall.dev",
      passwordHash,
      name: "Pet Owner",
      role: "OWNER",
      emailVerifiedAt: new Date(),
      countryCode: "NG",
      regionCode: "LA",
    },
  });
  console.log("Created owner:", owner.email);

  // Vet user
  const vetUser = await prisma.user.upsert({
    where: { email: "vet@demo.pawscall.dev" },
    update: {},
    create: {
      email: "vet@demo.pawscall.dev",
      passwordHash,
      name: "Dr. Sarah Veterinarian",
      role: "VET",
      emailVerifiedAt: new Date(),
      countryCode: "NG",
      regionCode: "LA",
    },
  });
  console.log("Created vet user:", vetUser.email);

  const vetProfile = await prisma.vetProfile.upsert({
    where: { userId: vetUser.id },
    update: {},
    create: {
      userId: vetUser.id,
      bio: "Small animal veterinarian with 10 years experience.",
      specialty: "Small Animal",
      yearsExperience: 10,
      languages: ["en"],
      malpracticeInsuranceVerified: true,
      idVerified: true,
      verificationStatus: "VERIFIED",
      isOnline: true,
      defaultCommissionRateBps: 1500,
    },
  });
  console.log("Created vet profile:", vetProfile.id);

  await prisma.license.upsert({
    where: { id: "license-la" },
    update: {},
    create: {
      id: "license-la",
      vetProfileId: vetProfile.id,
      licenseNumber: "VET-12345-LA",
      countryCode: "NG",
      regionCode: "LA",
      verificationStatus: "VERIFIED",
    },
  });
  console.log("Created license for Lagos");

  // Pet for owner
  const pet = await prisma.pet.upsert({
    where: { id: "pet-1" },
    update: {},
    create: {
      id: "pet-1",
      ownerId: owner.id,
      name: "Buddy",
      species: "DOG",
      breed: "Golden Retriever",
      birthDate: new Date("2020-03-15"),
      sex: "MALE",
      spayedNeutered: true,
      weightKg: 32.5,
      allergies: ["chicken"],
      chronicConditions: [],
      medications: [],
      vaccinationHistory: ["DHPP 2024", "Rabies 2023"],
    },
  });
  console.log("Created pet:", pet.name);

  // Partner clinic
  await prisma.partnerClinic.upsert({
    where: { id: "clinic-1" },
    update: {},
    create: {
      id: "clinic-1",
      name: "Lagos Emergency Vet Hospital",
      address: "123 Vet St, Lagos, Nigeria",
      lat: 6.5244,
      lng: 3.3792,
      phone: "+234-1-555-0100",
      email: "er@lagosvet.com",
      hours: { monday: "24/7", tuesday: "24/7", wednesday: "24/7", thursday: "24/7", friday: "24/7", saturday: "24/7", sunday: "24/7" },
      acceptsReferrals: true,
    },
  });
  console.log("Created partner clinic");

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await platformPrisma.$disconnect();
  });