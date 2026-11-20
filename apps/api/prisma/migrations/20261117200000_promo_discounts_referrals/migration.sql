-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'QUALIFIED', 'REWARDED', 'VOID');

-- AlterTable
ALTER TABLE "PromoCode" ADD COLUMN     "discountAmountMxn" INTEGER,
ADD COLUMN     "discountMonths" INTEGER,
ADD COLUMN     "discountPercent" INTEGER,
ADD COLUMN     "planTypes" "PlanType"[] DEFAULT ARRAY[]::"PlanType"[];

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "referralCode" TEXT;

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerTenantId" TEXT NOT NULL,
    "referredTenantId" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "rewardAmountCents" INTEGER,
    "stripeBalanceTxnId" TEXT,
    "qualifiedAt" TIMESTAMP(3),
    "rewardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referredTenantId_key" ON "Referral"("referredTenantId");

-- CreateIndex
CREATE INDEX "Referral_referrerTenantId_idx" ON "Referral"("referrerTenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_referralCode_key" ON "Tenant"("referralCode");

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerTenantId_fkey" FOREIGN KEY ("referrerTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredTenantId_fkey" FOREIGN KEY ("referredTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

