-- Rename agenda Appointment → StockAppointment (conserva brandId/slotId/bookedById).
ALTER TABLE "Appointment" RENAME TO "StockAppointment";

ALTER TABLE "StockAppointment" RENAME CONSTRAINT "Appointment_pkey" TO "StockAppointment_pkey";
ALTER TABLE "StockAppointment" RENAME CONSTRAINT "Appointment_tenantId_fkey" TO "StockAppointment_tenantId_fkey";
ALTER TABLE "StockAppointment" RENAME CONSTRAINT "Appointment_brandId_fkey" TO "StockAppointment_brandId_fkey";
ALTER TABLE "StockAppointment" RENAME CONSTRAINT "Appointment_slotId_fkey" TO "StockAppointment_slotId_fkey";
ALTER TABLE "StockAppointment" RENAME CONSTRAINT "Appointment_bookedById_fkey" TO "StockAppointment_bookedById_fkey";

ALTER INDEX "Appointment_slotId_key" RENAME TO "StockAppointment_slotId_key";
ALTER INDEX "Appointment_tenantId_createdAt_idx" RENAME TO "StockAppointment_tenantId_createdAt_idx";
ALTER INDEX "Appointment_brandId_createdAt_idx" RENAME TO "StockAppointment_brandId_createdAt_idx";

CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

CREATE TABLE "WhatsappConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL DEFAULT '',
    "wabaId" TEXT NOT NULL DEFAULT '',
    "accessToken" TEXT NOT NULL DEFAULT '',
    "webhookVerifyToken" TEXT NOT NULL DEFAULT '',
    "systemPrompt" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessHour" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessHour_pkey" PRIMARY KEY ("id")
);

-- Tabla nueva de citas a clientes (sin brandId/slotId/bookedById).
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serviceId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsappConfig_tenantId_key" ON "WhatsappConfig"("tenantId");
CREATE INDEX "Service_tenantId_idx" ON "Service"("tenantId");
CREATE UNIQUE INDEX "BusinessHour_tenantId_dayOfWeek_key" ON "BusinessHour"("tenantId", "dayOfWeek");
CREATE INDEX "BusinessHour_tenantId_idx" ON "BusinessHour"("tenantId");
CREATE INDEX "Appointment_tenantId_startTime_idx" ON "Appointment"("tenantId", "startTime");
CREATE INDEX "Appointment_tenantId_status_idx" ON "Appointment"("tenantId", "status");

ALTER TABLE "WhatsappConfig"
    ADD CONSTRAINT "WhatsappConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Service"
    ADD CONSTRAINT "Service_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BusinessHour"
    ADD CONSTRAINT "BusinessHour_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_no_overlap"
    EXCLUDE USING gist (
        "tenantId" WITH =,
        tsrange("startTime", "endTime", '[)') WITH &&
    )
    WHERE ("status" IN ('PENDING', 'CONFIRMED'));
