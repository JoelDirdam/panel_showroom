-- La prueba gratis ya no es automática: solo la da un código.
-- extraTrialDays (días sobre 15 base) pasa a trialDays (días totales de prueba).
ALTER TABLE "PromoCode" RENAME COLUMN "extraTrialDays" TO "trialDays";
ALTER TABLE "PromoCode" ALTER COLUMN "trialDays" SET DEFAULT 0;
-- Los códigos existentes conservan el total que prometían (15 base + extra).
UPDATE "PromoCode" SET "trialDays" = "trialDays" + 15 WHERE "trialDays" > 0;
