-- Brand: replace single cutoffDate with monthly day slots (aligned with preferences).
ALTER TABLE "Brand" ADD COLUMN IF NOT EXISTS "cutoffDaySlots" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

UPDATE "Brand"
SET "cutoffDaySlots" = ARRAY[EXTRACT(DAY FROM "cutoffDate")::INTEGER]
WHERE "cutoffDate" IS NOT NULL
  AND (cardinality("cutoffDaySlots") = 0 OR "cutoffDaySlots" IS NULL);

ALTER TABLE "Brand" DROP COLUMN IF EXISTS "cutoffDate";
