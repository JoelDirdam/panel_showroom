-- AlterTable TenantSubscription: payment stub fields
ALTER TABLE "TenantSubscription" ADD COLUMN IF NOT EXISTS "paymentDeferred" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TenantSubscription" ADD COLUMN IF NOT EXISTS "currentPeriodEndsAt" TIMESTAMP(3);
ALTER TABLE "TenantSubscription" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT;
ALTER TABLE "TenantSubscription" ADD COLUMN IF NOT EXISTS "externalCustomerId" TEXT;

-- AlterTable Sale: owner can attend without employee
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "attendedByUserId" TEXT;

CREATE INDEX IF NOT EXISTS "Sale_attendedByUserId_idx" ON "Sale"("attendedByUserId");

DO $$ BEGIN
  ALTER TABLE "Sale" ADD CONSTRAINT "Sale_attendedByUserId_fkey"
    FOREIGN KEY ("attendedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
