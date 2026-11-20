/**
 * Crea cuentas de prueba internas (Tenant.isTest = true), una por plan, tal como
 * quedan al terminar el registro: negocio configurado, correo verificado, términos
 * vigentes aceptados y prueba gratuita de 365 días sin tarjeta. No envía correos.
 *
 * Es idempotente: si el correo ya existe, no lo toca (a menos que pases
 * --reset-password, que le asigna una contraseña nueva).
 * Las contraseñas se escriben SOLO en el archivo indicado en OUT_FILE (no en pantalla).
 *
 * Uso: OUT_FILE=../../cuentas-de-prueba.local.md npx tsx prisma/create-test-accounts.ts [--reset-password]
 */
import { randomBytes } from 'node:crypto'
import { appendFileSync, existsSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { PrismaClient, type PlanType } from '@prisma/client'

const prisma = new PrismaClient()
const DAY_MS = 24 * 60 * 60 * 1000
const TRIAL_DAYS = 365
const ACTOR = 'cli:create-test-accounts'

const ACCOUNTS: { plan: PlanType; planLabel: string; email: string; name: string; business: string; slug: string }[] = [
  {
    plan: 'NEGOCIO',
    planLabel: 'Negocio',
    email: 'prueba.negocio@cosdi.mx',
    name: 'Prueba Negocio',
    business: 'Tienda de Prueba COSDI',
    slug: 'prueba-negocio-cosdi',
  },
  {
    plan: 'CITAS_RECORDATORIOS',
    planLabel: 'Citas con recordatorios',
    email: 'prueba.recordatorios@cosdi.mx',
    name: 'Prueba Recordatorios',
    business: 'Consultorio de Prueba COSDI',
    slug: 'prueba-recordatorios-cosdi',
  },
  {
    plan: 'CITAS_IA',
    planLabel: 'Citas + IA',
    email: 'prueba.citas-ia@cosdi.mx',
    name: 'Prueba Citas IA',
    business: 'Estética IA de Prueba COSDI',
    slug: 'prueba-citas-ia-cosdi',
  },
]

function newPassword(): string {
  // 16 caracteres legibles + sufijo que cumple cualquier regla de complejidad.
  return `${randomBytes(12).toString('base64url')}-Cd9`
}

async function main() {
  const outFile = process.env.OUT_FILE
  if (!outFile) throw new Error('Define OUT_FILE (archivo donde se guardan las contraseñas)')
  const resetPassword = process.argv.includes('--reset-password')
  const env = process.env.ENV_LABEL || 'local'

  const terms = await prisma.termsDocument.findFirst({ orderBy: { publishedAt: 'desc' } })
  if (!terms) throw new Error('No hay términos publicados')
  const contentHash = createHash('sha256').update(terms.content).digest('hex')

  const lines: string[] = []
  for (const a of ACCOUNTS) {
    const existing = await prisma.user.findUnique({ where: { email: a.email }, include: { tenant: { select: { name: true, isTest: true } } } })
    if (existing) {
      if (!existing.tenant?.isTest) throw new Error(`${a.email} existe y NO es cuenta de prueba: no se toca`)
      if (!resetPassword) {
        console.log(`[ya existe] ${a.email} (${a.planLabel})`)
        continue
      }
      const password = newPassword()
      await prisma.user.update({ where: { id: existing.id }, data: { password: await bcrypt.hash(password, 10) } })
      lines.push(`| ${env} | ${a.planLabel} | ${existing.tenant.name} | ${a.email} | \`${password}\` |`)
      console.log(`[contraseña nueva] ${a.email}`)
      continue
    }
    if (await prisma.tenant.findUnique({ where: { slug: a.slug }, select: { id: true } })) throw new Error(`El slug ${a.slug} ya existe`)

    const password = newPassword()
    const now = new Date()
    const tenant = await prisma.$transaction(async (tx) => {
      const t = await tx.tenant.create({
        data: { name: a.business, slug: a.slug, onboardingComplete: true, isTest: true },
        // Solo estas columnas: el script funciona aunque la base aún no tenga migraciones más nuevas.
        select: { id: true, name: true },
      })
      await tx.sucursal.create({ data: { tenantId: t.id, name: 'Sucursal principal' } })
      const user = await tx.user.create({
        data: {
          email: a.email,
          password: await bcrypt.hash(password, 10),
          name: a.name,
          role: 'BUSINESS',
          tenantId: t.id,
          onboardingStep: 'DONE',
          emailVerifiedAt: now,
          marketingOptIn: false,
        },
      })
      await tx.termsAcceptance.create({
        data: {
          userId: user.id,
          version: terms.version,
          signedName: a.name,
          email: a.email,
          userAgent: ACTOR,
          contentHash,
          source: 'test-account',
        },
      })
      await tx.tenantSubscription.create({
        data: {
          tenantId: t.id,
          planType: a.plan,
          status: 'TRIALING',
          trialEndsAt: new Date(now.getTime() + TRIAL_DAYS * DAY_MS),
          paymentDeferred: true,
        },
      })
      await tx.businessPreferences.create({ data: { tenantId: t.id, cutoffDaySlots: [] } })
      await tx.adminAuditLog.create({
        data: {
          actorEmail: ACTOR,
          action: 'tenant.mark_test',
          targetType: 'tenant',
          targetId: t.id,
          targetLabel: t.name,
          details: { created: true, plan: a.plan, email: a.email },
        },
      })
      return t
    })
    lines.push(`| ${env} | ${a.planLabel} | ${tenant.name} | ${a.email} | \`${password}\` |`)
    console.log(`[creada] ${a.email} (${a.planLabel})`)
  }

  if (lines.length) {
    if (!existsSync(outFile)) {
      writeFileSync(
        outFile,
        '# Cuentas de prueba de COSDI\n\n' +
          'Archivo local con contraseñas: NO lo subas a git (está en .gitignore).\n' +
          'Son cuentas internas (marcadas como prueba): no reciben correos masivos ni automáticos y no se eliminan por inactividad.\n' +
          'Prueba gratuita de 365 días sin tarjeta; se puede extender o cambiar desde Superadmin → ficha del negocio.\n\n' +
          '| Entorno | Plan | Negocio | Correo | Contraseña |\n|---|---|---|---|---|\n',
      )
    }
    appendFileSync(outFile, `${lines.join('\n')}\n`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
