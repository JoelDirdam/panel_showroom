-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Employee_tenantId_idx" ON "Employee"("tenantId");

-- CreateIndex
CREATE INDEX "Employee_tenantId_active_idx" ON "Employee"("tenantId", "active");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey Sale.attendedBy -> User (will point to Employee)
ALTER TABLE "Sale" DROP CONSTRAINT IF EXISTS "Sale_attendedById_fkey";

-- Nullify historical attendedById values (were User ids; no longer valid)
UPDATE "Sale" SET "attendedById" = NULL WHERE "attendedById" IS NOT NULL;

-- AddForeignKey Sale.attendedBy -> Employee
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_attendedById_fkey" FOREIGN KEY ("attendedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- User.tenantId optional for SUPER_ADMIN
ALTER TABLE "User" ALTER COLUMN "tenantId" DROP NOT NULL;

-- Preferences: boolean ticketComments -> text ticketFixedComment
ALTER TABLE "BusinessPreferences" ADD COLUMN "ticketFixedComment" TEXT;
ALTER TABLE "BusinessPreferences" DROP COLUMN IF EXISTS "ticketComments";
