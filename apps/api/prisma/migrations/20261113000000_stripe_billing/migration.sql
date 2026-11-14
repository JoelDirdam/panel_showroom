-- Cobro de suscripciones con Stripe
ALTER TABLE "TenantSubscription"
  ADD COLUMN "externalSubscriptionId" TEXT,
  ADD COLUMN "priceId" TEXT,
  ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastPaymentAt" TIMESTAMP(3);

CREATE INDEX "TenantSubscription_externalCustomerId_idx" ON "TenantSubscription"("externalCustomerId");
CREATE INDEX "TenantSubscription_externalSubscriptionId_idx" ON "TenantSubscription"("externalSubscriptionId");

CREATE TABLE "ProcessedWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcessedWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- WhatsApp: número propio del negocio y control de recordatorios
ALTER TABLE "WhatsappConfig"
  ADD COLUMN "displayPhoneNumber" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "verifiedName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "templateStatus" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "remindersEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "aiEnabled" BOOLEAN NOT NULL DEFAULT true;
