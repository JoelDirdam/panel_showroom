/**
 * Entorno de ejecución. En Railway, `NODE_ENV` es `production` también en dev
 * (lo fija el Dockerfile), así que se usa el nombre del entorno de Railway.
 * Un nombre desconocido cuenta como producción: ante la duda, se exige todo.
 */
const NON_PRODUCTION = new Set(['dev', 'development', 'staging', 'local', 'test'])

export function isNonProductionEnvironment(): boolean {
  const railway = process.env.RAILWAY_ENVIRONMENT_NAME?.trim().toLowerCase()
  if (railway) return NON_PRODUCTION.has(railway)
  return process.env.NODE_ENV !== 'production'
}

/** En producción el SUPER_ADMIN siempre necesita la verificación en dos pasos; en dev no. */
export function superAdminTwoFactorRequired(): boolean {
  return !isNonProductionEnvironment()
}
