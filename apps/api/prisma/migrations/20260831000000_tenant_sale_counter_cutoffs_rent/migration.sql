-- Drop global unique on ticketNumber
DROP INDEX IF EXISTS "Sale_ticketNumber_key";

-- Renumber ticketNumber per tenant (ordered by soldAt, createdAt)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "tenantId"
      ORDER BY "soldAt" ASC, "createdAt" ASC
    ) AS rn
  FROM "Sale"
)
UPDATE "Sale" s
SET "ticketNumber" = r.rn
FROM ranked r
WHERE s.id = r.id;

-- Composite unique per tenant
CREATE UNIQUE INDEX "Sale_tenantId_ticketNumber_key" ON "Sale"("tenantId", "ticketNumber");

-- Tenant sale counters
CREATE TABLE "TenantSaleCounter" (
    "tenantId" TEXT NOT NULL,
    "nextTicketNumber" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "TenantSaleCounter_pkey" PRIMARY KEY ("tenantId")
);

INSERT INTO "TenantSaleCounter" ("tenantId", "nextTicketNumber")
SELECT "tenantId", COALESCE(MAX("ticketNumber"), 0) + 1
FROM "Sale"
GROUP BY "tenantId";

INSERT INTO "TenantSaleCounter" ("tenantId", "nextTicketNumber")
SELECT t.id, 1
FROM "Tenant" t
WHERE NOT EXISTS (
  SELECT 1 FROM "TenantSaleCounter" c WHERE c."tenantId" = t.id
);

ALTER TABLE "TenantSaleCounter" ADD CONSTRAINT "TenantSaleCounter_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rent payment status enum
CREATE TYPE "RentPaymentStatus" AS ENUM ('PENDING', 'PAID');

CREATE TABLE "BrandRentPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "RentPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paidById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandRentPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrandRentPayment_brandId_year_month_key" ON "BrandRentPayment"("brandId", "year", "month");
CREATE INDEX "BrandRentPayment_tenantId_status_dueDate_idx" ON "BrandRentPayment"("tenantId", "status", "dueDate");

ALTER TABLE "BrandRentPayment" ADD CONSTRAINT "BrandRentPayment_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandRentPayment" ADD CONSTRAINT "BrandRentPayment_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Cutoff settlement status enum
CREATE TYPE "CutoffSettlementStatus" AS ENUM ('OPEN', 'CLOSED', 'PAID');

CREATE TABLE "BrandCutoffSettlement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "status" "CutoffSettlementStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paidById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandCutoffSettlement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BrandCutoffSettlement_tenantId_brandId_periodTo_idx"
  ON "BrandCutoffSettlement"("tenantId", "brandId", "periodTo");

ALTER TABLE "BrandCutoffSettlement" ADD CONSTRAINT "BrandCutoffSettlement_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrandCutoffSettlement" ADD CONSTRAINT "BrandCutoffSettlement_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
