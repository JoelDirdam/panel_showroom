-- Segundo bloque de horario por día (ej. comida): el negocio no atiende entre breakStart y breakEnd.
ALTER TABLE "BusinessHour" ADD COLUMN "breakStart" TEXT;
ALTER TABLE "BusinessHour" ADD COLUMN "breakEnd" TEXT;
