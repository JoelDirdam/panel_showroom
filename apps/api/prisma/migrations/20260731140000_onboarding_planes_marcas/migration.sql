-- CreateEnum
CREATE TYPE "OnboardingStep" AS ENUM ('REGISTERED', 'EMAIL_VERIFIED', 'PLAN_SELECTED', 'BUSINESS_CREATED', 'DONE');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('NEGOCIO', 'CLINICA', 'RESTAURANTE', 'MARCA');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "CommissionFeePayer" AS ENUM ('BRAND', 'CLIENT', 'BUSINESS');

-- CreateEnum
CREATE TYPE "CutoffType" AS ENUM ('WEEKLY', 'MONTHLY_FIXED');

-- CreateEnum
CREATE TYPE "UsdRateMode" AS ENUM ('FIXED', 'AUTOMATIC');

-- AlterEnum
ALTER TYPE "ProductRequestType" ADD VALUE 'WITHDRAWAL';

-- AlterEnum
ALTER TYPE "ProductRequestStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "rfc" TEXT,
ADD COLUMN "socialUrl" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "logoUrl" TEXT,
ADD COLUMN "onboardingComplete" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "phone" TEXT,
ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3),
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "timezone" TEXT DEFAULT 'America/Mexico_City',
ADD COLUMN "onboardingStep" "OnboardingStep" NOT NULL DEFAULT 'DONE';

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN "monthlyRent" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "assignedSpace" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "cutoffDate" TIMESTAMP(3),
ADD COLUMN "commissionPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN "cardFeePayer" "CommissionFeePayer" NOT NULL DEFAULT 'BRAND',
ADD COLUMN "transferFeePayer" "CommissionFeePayer" NOT NULL DEFAULT 'BRAND',
ADD COLUMN "inviteCodeHash" TEXT,
ADD COLUMN "inviteCodeExpiresAt" TIMESTAMP(3),
ADD COLUMN "ownerUserId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;

-- AlterTable
ALTER TABLE "ProductRequest" ADD COLUMN "rejectedById" TEXT,
ADD COLUMN "rejectedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TermsDocument" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TermsDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TermsAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "signedName" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,

    CONSTRAINT "TermsAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsVerificationCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsVerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "extraTrialDays" INTEGER NOT NULL DEFAULT 15,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planType" "PlanType" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "trialEndsAt" TIMESTAMP(3) NOT NULL,
    "promoCodeUsed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessPreferences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "primaryTerminalCommission" DECIMAL(5,2),
    "secondaryTerminalCommission" DECIMAL(5,2),
    "transferCommission" DECIMAL(5,2),
    "layawayDueDays" INTEGER NOT NULL DEFAULT 15,
    "labelWidthMm" INTEGER,
    "labelHeightMm" INTEGER,
    "flexibleInventory" BOOLEAN NOT NULL DEFAULT false,
    "printTickets" BOOLEAN NOT NULL DEFAULT true,
    "ticketComments" BOOLEAN NOT NULL DEFAULT true,
    "chargeIva" BOOLEAN NOT NULL DEFAULT false,
    "usdEnabled" BOOLEAN NOT NULL DEFAULT false,
    "usdRateMode" "UsdRateMode",
    "usdFixedRate" DECIMAL(10,4),
    "cutoffType" "CutoffType" NOT NULL DEFAULT 'MONTHLY_FIXED',
    "cutoffWeekday" INTEGER,
    "cutoffDaySlots" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TermsDocument_version_key" ON "TermsDocument"("version");

-- CreateIndex
CREATE INDEX "TermsAcceptance_userId_idx" ON "TermsAcceptance"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TermsAcceptance_userId_version_key" ON "TermsAcceptance"("userId", "version");

-- CreateIndex
CREATE INDEX "EmailVerificationCode_userId_idx" ON "EmailVerificationCode"("userId");

-- CreateIndex
CREATE INDEX "SmsVerificationCode_userId_idx" ON "SmsVerificationCode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TenantSubscription_tenantId_key" ON "TenantSubscription"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessPreferences_tenantId_key" ON "BusinessPreferences"("tenantId");

-- CreateIndex
CREATE INDEX "Category_tenantId_idx" ON "Category"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_tenantId_slug_key" ON "Category"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "Brand_ownerUserId_idx" ON "Brand"("ownerUserId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductRequest" ADD CONSTRAINT "ProductRequest_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TermsAcceptance" ADD CONSTRAINT "TermsAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationCode" ADD CONSTRAINT "EmailVerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsVerificationCode" ADD CONSTRAINT "SmsVerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessPreferences" ADD CONSTRAINT "BusinessPreferences_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: legacy users/tenants are treated as fully onboarded
UPDATE "User" SET "onboardingStep" = 'DONE' WHERE "onboardingStep" IS NULL;
UPDATE "User" SET "emailVerifiedAt" = CURRENT_TIMESTAMP WHERE "emailVerifiedAt" IS NULL;
UPDATE "Tenant" SET "onboardingComplete" = true WHERE "onboardingComplete" IS NULL;
