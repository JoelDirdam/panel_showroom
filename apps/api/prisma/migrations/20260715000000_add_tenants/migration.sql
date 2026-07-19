-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- Seed default tenant for existing data
INSERT INTO "Tenant" ("id", "name", "slug", "active", "createdAt", "updatedAt")
VALUES ('tenant_showroom_default', 'Showroom Demo', 'showroom-demo', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Brand" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Sale" ADD COLUMN "tenantId" TEXT;

-- Backfill existing rows
UPDATE "User" SET "tenantId" = 'tenant_showroom_default' WHERE "tenantId" IS NULL;
UPDATE "Brand" SET "tenantId" = 'tenant_showroom_default' WHERE "tenantId" IS NULL;
UPDATE "Sale" SET "tenantId" = 'tenant_showroom_default' WHERE "tenantId" IS NULL;

-- Make tenantId required
ALTER TABLE "User" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Brand" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Sale" ALTER COLUMN "tenantId" SET NOT NULL;

-- Drop old Brand slug unique constraint
DROP INDEX IF EXISTS "Brand_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX "Brand_tenantId_slug_key" ON "Brand"("tenantId", "slug");
CREATE INDEX "Brand_tenantId_idx" ON "Brand"("tenantId");
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");
CREATE INDEX "Sale_tenantId_soldAt_idx" ON "Sale"("tenantId", "soldAt");

-- DropIndex (replace soldAt-only index)
DROP INDEX IF EXISTS "Sale_soldAt_idx";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
