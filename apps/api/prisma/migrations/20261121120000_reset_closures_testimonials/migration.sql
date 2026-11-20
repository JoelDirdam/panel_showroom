-- Recuperar contraseña, vacaciones/pausa de reservas y testimonios. Solo agrega columnas y tablas.

ALTER TABLE "User" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);

ALTER TABLE "Tenant" ADD COLUMN "bookingPaused" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN "bookingPauseMessage" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "bookingPauseUntil" TEXT;

CREATE TABLE "PasswordResetCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetCode_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PasswordResetCode_userId_idx" ON "PasswordResetCode"("userId");
ALTER TABLE "PasswordResetCode" ADD CONSTRAINT "PasswordResetCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "BusinessClosure" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "publicMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BusinessClosure_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BusinessClosure_tenantId_startDate_idx" ON "BusinessClosure"("tenantId", "startDate");
ALTER TABLE "BusinessClosure" ADD CONSTRAINT "BusinessClosure_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "authorName" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "authorRole" TEXT,
    "quote" TEXT NOT NULL,
    "rating" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'PANEL',
    "sourceUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "consentAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Testimonial_tenantId_key" ON "Testimonial"("tenantId");
CREATE INDEX "Testimonial_status_idx" ON "Testimonial"("status");
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
