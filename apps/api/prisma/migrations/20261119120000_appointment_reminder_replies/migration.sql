-- Recordatorios con botones: respuesta del cliente y estado "no asistió".
ALTER TYPE "AppointmentStatus" ADD VALUE 'NO_SHOW';
ALTER TABLE "Appointment" ADD COLUMN "reminderMessageId" TEXT,
ADD COLUMN "customerReply" TEXT,
ADD COLUMN "customerRepliedAt" TIMESTAMP(3);
