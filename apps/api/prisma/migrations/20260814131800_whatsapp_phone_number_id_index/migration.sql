-- Lookup inbound de webhook por phone_number_id (no unique: default "").
CREATE INDEX "WhatsappConfig_phoneNumberId_idx" ON "WhatsappConfig"("phoneNumberId");
