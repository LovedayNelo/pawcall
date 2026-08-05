import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("password123", 10);

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@pawscall.dev" },
    update: {},
    create: {
      email: "admin@pawscall.dev",
      passwordHash,
      name: "Admin User",
      role: "ADMIN",
      emailVerifiedAt: new Date(),
    },
  });
  console.log("Created admin:", admin.email);

  // Owner user
  const owner = await prisma.user.upsert({
    where: { email: "owner@pawscall.dev" },
    update: {},
    create: {
      email: "owner@pawscall.dev",
      passwordHash,
      name: "Pet Owner",
      role: "OWNER",
      emailVerifiedAt: new Date(),
      countryCode: "US",
      regionCode: "WA",
    },
  });
  console.log("Created owner:", owner.email);

  // Vet user
  const vetUser = await prisma.user.upsert({
    where: { email: "vet@pawscall.dev" },
    update: {},
    create: {
      email: "vet@pawscall.dev",
      passwordHash,
      name: "Dr. Sarah Veterinarian",
      role: "VET",
      emailVerifiedAt: new Date(),
      countryCode: "US",
      regionCode: "WA",
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
      languages: ["en", "es"],
      malpracticeInsuranceVerified: true,
      idVerified: true,
      verificationStatus: "VERIFIED",
      isOnline: true,
      defaultCommissionRateBps: 1500,
    },
  });
  console.log("Created vet profile:", vetProfile.id);

  await prisma.license.upsert({
    where: { id: "license-wa" },
    update: {},
    create: {
      id: "license-wa",
      vetProfileId: vetProfile.id,
      licenseNumber: "VET-12345-WA",
      countryCode: "US",
      regionCode: "WA",
      verificationStatus: "VERIFIED",
    },
  });
  console.log("Created license for WA");

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
      name: "Seattle Emergency Vet Hospital",
      address: "123 Vet St, Seattle, WA 98101",
      lat: 47.6062,
      lng: -122.3321,
      phone: "+1-206-555-0100",
      email: "er@seattlevet.com",
      hours: { monday: "24/7", tuesday: "24/7", wednesday: "24/7", thursday: "24/7", friday: "24/7", saturday: "24/7", sunday: "24/7" },
      acceptsReferrals: true,
    },
  });
  console.log("Created partner clinic");

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });