-- Recordatorios de cita por WhatsApp
ALTER TABLE "Appointment" ADD COLUMN "reminderSentAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN "reminderAttempts" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "Appointment_status_reminderSentAt_startTime_idx" ON "Appointment"("status", "reminderSentAt", "startTime");
