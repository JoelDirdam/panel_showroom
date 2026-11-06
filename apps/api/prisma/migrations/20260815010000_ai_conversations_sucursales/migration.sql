-- CreateEnum
CREATE TYPE "ConversationRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "Sucursal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sucursal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerName" TEXT,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "selectedSucursalId" TEXT,
    "humanRequestedAt" TIMESTAMP(3),
    "humanRequestReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "ConversationRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "sucursalId" TEXT;

-- Backfill one principal branch per tenant, then attach existing appointments.
INSERT INTO "Sucursal" ("id", "tenantId", "name", "address", "isActive", "createdAt", "updatedAt")
SELECT
    'c' || substr(md5(t.id || '-sucursal-principal'), 1, 24),
    t.id,
    'Sucursal principal',
    t.address,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Tenant" t
WHERE NOT EXISTS (
    SELECT 1 FROM "Sucursal" s WHERE s."tenantId" = t.id
);

UPDATE "Appointment" a
SET "sucursalId" = s.id
FROM "Sucursal" s
WHERE s."tenantId" = a."tenantId"
  AND a."sucursalId" IS NULL
  AND s.id = (
      SELECT s2.id
      FROM "Sucursal" s2
      WHERE s2."tenantId" = a."tenantId"
      ORDER BY s2."createdAt" ASC
      LIMIT 1
  );

-- Overlap is per sucursal (two branches may book the same clock time).
ALTER TABLE "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_no_overlap";

ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_no_overlap"
    EXCLUDE USING gist (
        "tenantId" WITH =,
        "sucursalId" WITH =,
        tsrange("startTime", "endTime", '[)') WITH &&
    )
    WHERE ("status" IN ('PENDING', 'CONFIRMED') AND "sucursalId" IS NOT NULL);

-- Indexes
CREATE INDEX "Sucursal_tenantId_idx" ON "Sucursal"("tenantId");
CREATE INDEX "Sucursal_tenantId_isActive_idx" ON "Sucursal"("tenantId", "isActive");
CREATE UNIQUE INDEX "Conversation_tenantId_customerPhone_key" ON "Conversation"("tenantId", "customerPhone");
CREATE INDEX "Conversation_tenantId_idx" ON "Conversation"("tenantId");
CREATE INDEX "ConversationMessage_conversationId_createdAt_idx" ON "ConversationMessage"("conversationId", "createdAt");
CREATE INDEX "Appointment_sucursalId_idx" ON "Appointment"("sucursalId");

-- FKs
ALTER TABLE "Sucursal"
    ADD CONSTRAINT "Sucursal_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Conversation"
    ADD CONSTRAINT "Conversation_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Conversation"
    ADD CONSTRAINT "Conversation_selectedSucursalId_fkey"
    FOREIGN KEY ("selectedSucursalId") REFERENCES "Sucursal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ConversationMessage"
    ADD CONSTRAINT "ConversationMessage_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_sucursalId_fkey"
    FOREIGN KEY ("sucursalId") REFERENCES "Sucursal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
