-- AlterTable
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN "isHouseBrand" BOOLEAN NOT NULL DEFAULT false;
