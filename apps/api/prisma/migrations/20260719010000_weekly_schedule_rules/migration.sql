-- AlterTable
ALTER TABLE "AgendaSettings" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Mexico_City';

-- CreateTable
CREATE TABLE "WeeklyScheduleRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "ScheduleType" NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "intervalMinutes" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyScheduleRule_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ScheduleSlot" ADD COLUMN "ruleId" TEXT;

-- CreateIndex
CREATE INDEX "WeeklyScheduleRule_tenantId_type_idx" ON "WeeklyScheduleRule"("tenantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyScheduleRule_tenantId_type_weekday_key" ON "WeeklyScheduleRule"("tenantId", "type", "weekday");

-- CreateIndex
CREATE INDEX "ScheduleSlot_ruleId_idx" ON "ScheduleSlot"("ruleId");

-- AddForeignKey
ALTER TABLE "WeeklyScheduleRule" ADD CONSTRAINT "WeeklyScheduleRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleSlot" ADD CONSTRAINT "ScheduleSlot_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "WeeklyScheduleRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
