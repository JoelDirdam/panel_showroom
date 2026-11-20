-- Cuentas de prueba internas (excluidas de correos masivos y de la limpieza por inactividad)
ALTER TABLE "Tenant" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;
