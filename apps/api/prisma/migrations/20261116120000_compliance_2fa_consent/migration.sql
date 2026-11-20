-- Cumplimiento: 2FA (TOTP), consentimiento de marketing, evidencia de términos,
-- retención, reclamos de derechos de autor y configuración de plataforma.

-- DropForeignKey
ALTER TABLE "TermsAcceptance" DROP CONSTRAINT "TermsAcceptance_userId_fkey";

-- AlterTable
ALTER TABLE "PromoCode" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "retentionNoticeSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TenantSubscription" ADD COLUMN     "renewalNoticeFor" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TermsAcceptance" ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'register',
ADD COLUMN     "userAgent" TEXT,
ADD COLUMN     "userDeletedAt" TIMESTAMP(3),
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketingOptInAt" TIMESTAMP(3),
ADD COLUMN     "marketingOptOutAt" TIMESTAMP(3),
ADD COLUMN     "totpEnabledAt" TIMESTAMP(3),
ADD COLUMN     "totpLastStep" INTEGER,
ADD COLUMN     "totpRecoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "totpSecret" TEXT;

-- CreateTable
CREATE TABLE "ConsentEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "source" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userDeletedAt" TIMESTAMP(3),

    CONSTRAINT "ConsentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "CopyrightClaim" (
    "id" TEXT NOT NULL,
    "claimantName" TEXT NOT NULL,
    "claimantEmail" TEXT NOT NULL,
    "claimantPhone" TEXT,
    "rightsHolder" TEXT NOT NULL,
    "workDescription" TEXT NOT NULL,
    "infringingUrl" TEXT NOT NULL,
    "details" TEXT,
    "signature" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "adminNote" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "CopyrightClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountDeletionLog" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "tenantName" TEXT,
    "scope" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "ip" TEXT,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountDeletionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsentEvent_userId_idx" ON "ConsentEvent"("userId");

-- CreateIndex
CREATE INDEX "ConsentEvent_kind_createdAt_idx" ON "ConsentEvent"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "CopyrightClaim_status_createdAt_idx" ON "CopyrightClaim"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AccountDeletionLog_deletedAt_idx" ON "AccountDeletionLog"("deletedAt");

-- CreateIndex
CREATE INDEX "TermsAcceptance_acceptedAt_idx" ON "TermsAcceptance"("acceptedAt");

-- AddForeignKey
ALTER TABLE "TermsAcceptance" ADD CONSTRAINT "TermsAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentEvent" ADD CONSTRAINT "ConsentEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Evidencia hist�rica: copia el correo actual a las aceptaciones ya registradas.
UPDATE "TermsAcceptance" ta SET "email" = u."email" FROM "User" u WHERE ta."userId" = u."id" AND ta."email" IS NULL;

