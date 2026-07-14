-- DropIndex
DROP INDEX IF EXISTS "Product_barcode_idx";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN IF EXISTS "barcode";
