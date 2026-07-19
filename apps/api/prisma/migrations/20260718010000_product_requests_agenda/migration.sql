CREATE TYPE "ProductRequestType" AS ENUM ('CREATE_PRODUCT', 'RESTOCK');
CREATE TYPE "ProductRequestStatus" AS ENUM ('PENDING', 'ACCEPTED');
CREATE TYPE "ScheduleType" AS ENUM ('STOCK_DELIVERY', 'CUT_PICKUP');

ALTER TABLE "Brand" ADD COLUMN "whatsapp" TEXT;

CREATE TABLE "ProductRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "type" "ProductRequestType" NOT NULL,
    "status" "ProductRequestStatus" NOT NULL DEFAULT 'PENDING',
    "productId" TEXT,
    "name" TEXT,
    "sku" TEXT,
    "description" TEXT,
    "price" DECIMAL(10,2),
    "imageUrl" TEXT,
    "quantity" INTEGER NOT NULL,
    "minStock" INTEGER NOT NULL DEFAULT 5,
    "notes" TEXT,
    "acceptedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgendaSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stockDeliveryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cutPickupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgendaSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScheduleSlot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "ScheduleType" NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "bookedById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductRequest_tenantId_status_createdAt_idx"
    ON "ProductRequest"("tenantId", "status", "createdAt");
CREATE INDEX "ProductRequest_brandId_status_idx"
    ON "ProductRequest"("brandId", "status");
CREATE UNIQUE INDEX "AgendaSettings_tenantId_key" ON "AgendaSettings"("tenantId");
CREATE UNIQUE INDEX "ScheduleSlot_tenantId_type_startAt_endAt_key"
    ON "ScheduleSlot"("tenantId", "type", "startAt", "endAt");
CREATE INDEX "ScheduleSlot_tenantId_type_startAt_idx"
    ON "ScheduleSlot"("tenantId", "type", "startAt");
CREATE UNIQUE INDEX "Appointment_slotId_key" ON "Appointment"("slotId");
CREATE INDEX "Appointment_tenantId_createdAt_idx" ON "Appointment"("tenantId", "createdAt");
CREATE INDEX "Appointment_brandId_createdAt_idx" ON "Appointment"("brandId", "createdAt");

ALTER TABLE "ProductRequest"
    ADD CONSTRAINT "ProductRequest_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductRequest"
    ADD CONSTRAINT "ProductRequest_brandId_fkey"
    FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductRequest"
    ADD CONSTRAINT "ProductRequest_requestedById_fkey"
    FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductRequest"
    ADD CONSTRAINT "ProductRequest_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductRequest"
    ADD CONSTRAINT "ProductRequest_acceptedById_fkey"
    FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgendaSettings"
    ADD CONSTRAINT "AgendaSettings_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduleSlot"
    ADD CONSTRAINT "ScheduleSlot_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_brandId_fkey"
    FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_slotId_fkey"
    FOREIGN KEY ("slotId") REFERENCES "ScheduleSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_bookedById_fkey"
    FOREIGN KEY ("bookedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
