-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'VET', 'TECH', 'ADMIN', 'PARTNER_CLINIC');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "PetSpecies" AS ENUM ('DOG', 'CAT', 'BIRD', 'REPTILE', 'SMALL_MAMMAL', 'RABBIT', 'FERRET', 'AVIAN', 'EXOTIC', 'OTHER');

-- CreateEnum
CREATE TYPE "VetVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ConsultType" AS ENUM ('ON_DEMAND', 'SCHEDULED', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "ConsultStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'DROPPED');

-- CreateEnum
CREATE TYPE "ConsultOutcome" AS ENUM ('MONITOR_AT_HOME', 'IN_PERSON_NON_URGENT', 'IN_PERSON_URGENT', 'EMERGENCY', 'NOT_DETERMINED');

-- CreateEnum
CREATE TYPE "TriageSeverity" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TriageDisposition" AS ENUM ('PROCEED_ONLINE', 'ROUTINE_IN_PERSON', 'URGENT_IN_PERSON', 'EMERGENCY_INTERRUPT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CAPTURED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('SCHEDULED', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('PUSH', 'SMS', 'EMAIL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "phone" TEXT,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OWNER',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "countryCode" TEXT,
    "regionCode" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" "PetSpecies" NOT NULL,
    "breed" TEXT,
    "birthDate" TIMESTAMP(3),
    "sex" "Gender",
    "spayedNeutered" BOOLEAN,
    "weightKg" DOUBLE PRECISION,
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "chronicConditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "medications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "vaccinationHistory" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetWeight" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PetWeight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VetProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "specialty" TEXT,
    "yearsExperience" INTEGER,
    "languages" TEXT[] DEFAULT ARRAY['en']::TEXT[],
    "malpracticeInsuranceVerified" BOOLEAN NOT NULL DEFAULT false,
    "idVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "VetVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "stripeConnectAccountId" TEXT,
    "defaultCommissionRateBps" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VetProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "vetProfileId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "regionCode" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "verificationStatus" "VetVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verificationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "vetProfileId" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "startTime" TEXT,
    "endTime" TEXT,
    "date" TIMESTAMP(3),
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consult" (
    "id" TEXT NOT NULL,
    "type" "ConsultType" NOT NULL,
    "status" "ConsultStatus" NOT NULL DEFAULT 'QUEUED',
    "outcome" "ConsultOutcome" NOT NULL DEFAULT 'NOT_DETERMINED',
    "ownerId" TEXT NOT NULL,
    "vetId" TEXT,
    "petId" TEXT,
    "countryCode" TEXT,
    "regionCode" TEXT,
    "scheduledStartAt" TIMESTAMP(3),
    "scheduledEndAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "waitEstimateMinutes" INTEGER,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "recordingConsentOwner" BOOLEAN NOT NULL DEFAULT false,
    "recordingConsentVet" BOOLEAN NOT NULL DEFAULT false,
    "videoProvider" TEXT,
    "videoRoomId" TEXT,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeForm" (
    "id" TEXT NOT NULL,
    "consultId" TEXT,
    "petId" TEXT,
    "symptomCategory" TEXT,
    "answers" JSONB NOT NULL,
    "photos" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntakeForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriageResult" (
    "id" TEXT NOT NULL,
    "intakeFormId" TEXT NOT NULL,
    "severity" "TriageSeverity" NOT NULL,
    "disposition" "TriageDisposition" NOT NULL,
    "matchedRules" TEXT[],
    "redFlagSymptoms" TEXT[],
    "recommendation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TriageResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultSummary" (
    "id" TEXT NOT NULL,
    "consultId" TEXT NOT NULL,
    "subjective" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "assessment" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "homeCareAdvice" TEXT,
    "redFlagsToWatch" TEXT,
    "recommendation" "ConsultOutcome" NOT NULL,
    "recommendationDetail" TEXT,
    "prescribedMeds" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" INTEGER NOT NULL,
    "maxUses" INTEGER,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "consultId" TEXT,
    "ownerId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "platformFeeCents" INTEGER NOT NULL,
    "vetEarnCents" INTEGER NOT NULL,
    "providerChargeCents" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripePaymentIntentId" TEXT,
    "promoCodeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "vetUserId" TEXT NOT NULL,
    "paymentId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PayoutStatus" NOT NULL DEFAULT 'SCHEDULED',
    "stripeTransferId" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "consultId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "vetId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "consultId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'text',
    "moderated" BOOLEAN NOT NULL DEFAULT false,
    "moderationResult" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalRecord" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" JSONB,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "petId" TEXT,
    "uploaderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerClinic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "phone" TEXT,
    "email" TEXT,
    "hours" JSONB,
    "acceptsReferrals" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerClinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "consultId" TEXT NOT NULL,
    "clinicId" TEXT,
    "clinicName" TEXT,
    "notes" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'PUSH',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "readAt" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "consultId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JurisdictionPolicy" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "regionCode" TEXT,
    "policyName" TEXT NOT NULL,
    "policyValue" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JurisdictionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VetProfile_userId_key" ON "VetProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Consult_paymentId_key" ON "Consult"("paymentId");

-- CreateIndex
CREATE INDEX "Consult_ownerId_status_idx" ON "Consult"("ownerId", "status");

-- CreateIndex
CREATE INDEX "Consult_vetId_status_idx" ON "Consult"("vetId", "status");

-- CreateIndex
CREATE INDEX "Consult_outcome_idx" ON "Consult"("outcome");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeForm_consultId_key" ON "IntakeForm"("consultId");

-- CreateIndex
CREATE UNIQUE INDEX "TriageResult_intakeFormId_key" ON "TriageResult"("intakeFormId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultSummary_consultId_key" ON "ConsultSummary"("consultId");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_consultId_key" ON "Payment"("consultId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_paymentId_key" ON "Dispute"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_consultId_key" ON "Review"("consultId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_consultId_key" ON "Referral"("consultId");

-- CreateIndex
CREATE UNIQUE INDEX "JurisdictionPolicy_countryCode_regionCode_policyName_key" ON "JurisdictionPolicy"("countryCode", "regionCode", "policyName");

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetWeight" ADD CONSTRAINT "PetWeight_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VetProfile" ADD CONSTRAINT "VetProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_vetProfileId_fkey" FOREIGN KEY ("vetProfileId") REFERENCES "VetProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_vetProfileId_fkey" FOREIGN KEY ("vetProfileId") REFERENCES "VetProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consult" ADD CONSTRAINT "Consult_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consult" ADD CONSTRAINT "Consult_vetId_fkey" FOREIGN KEY ("vetId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consult" ADD CONSTRAINT "Consult_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeForm" ADD CONSTRAINT "IntakeForm_consultId_fkey" FOREIGN KEY ("consultId") REFERENCES "Consult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeForm" ADD CONSTRAINT "IntakeForm_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriageResult" ADD CONSTRAINT "TriageResult_intakeFormId_fkey" FOREIGN KEY ("intakeFormId") REFERENCES "IntakeForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultSummary" ADD CONSTRAINT "ConsultSummary_consultId_fkey" FOREIGN KEY ("consultId") REFERENCES "Consult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_consultId_fkey" FOREIGN KEY ("consultId") REFERENCES "Consult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_vetUserId_fkey" FOREIGN KEY ("vetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_consultId_fkey" FOREIGN KEY ("consultId") REFERENCES "Consult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_vetId_fkey" FOREIGN KEY ("vetId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_consultId_fkey" FOREIGN KEY ("consultId") REFERENCES "Consult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_consultId_fkey" FOREIGN KEY ("consultId") REFERENCES "Consult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "PartnerClinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_consultId_fkey" FOREIGN KEY ("consultId") REFERENCES "Consult"("id") ON DELETE SET NULL ON UPDATE CASCADE;
