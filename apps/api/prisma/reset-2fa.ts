/**
 * Emergencia: quita la verificación en dos pasos de una cuenta que perdió su
 * teléfono Y sus códigos de recuperación. La cuenta tendrá que configurarla de
 * nuevo (el SUPER_ADMIN no puede usar el panel de plataforma hasta hacerlo).
 *
 * Uso local:  RESET_2FA_EMAIL=correo@dominio.com npx tsx prisma/reset-2fa.ts
 * Producción: railway run --service api --environment production -- sh -c "RESET_2FA_EMAIL=... npx tsx prisma/reset-2fa.ts"
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.RESET_2FA_EMAIL?.trim().toLowerCase()
  if (!email) {
    console.error('Define RESET_2FA_EMAIL con el correo de la cuenta')
    process.exit(1)
  }
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`No existe una cuenta con el correo ${email}`)
    process.exit(1)
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: null, totpEnabledAt: null, totpLastStep: null, totpRecoveryCodes: [] },
  })
  await prisma.adminAuditLog.create({
    data: {
      actorEmail: 'servidor (npm run db:reset-2fa)',
      action: 'account.2fa_reset',
      targetType: 'account',
      targetId: user.id,
      targetLabel: user.email,
    },
  })
  console.log(`2FA restablecido para ${user.email} (${user.role}). Debe configurarlo de nuevo al entrar.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
