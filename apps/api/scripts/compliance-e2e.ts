/**
 * Prueba de punta a punta de las funciones de cumplimiento contra una API LOCAL
 * (nunca producción): 2FA, registro con consentimientos, exportar/eliminar datos,
 * baja de correos, panel de plataforma (promos, rastreadores, legal).
 *
 * Uso: npx tsx scripts/compliance-e2e.ts   (con `npm run dev` corriendo en :3000)
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { base32Encode, currentStep, hotp } from '../src/lib/totp.js'
import { signPurposeToken } from '../src/middleware/auth.js'

const API = process.env.E2E_API_URL || 'http://localhost:3000/api'
if (!/localhost|127\.0\.0\.1/.test(API) || !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL || '')) {
  console.error('Esta prueba solo corre contra una API y base de datos locales.')
  process.exit(1)
}

const prisma = new PrismaClient()
let failed = 0
function check(name: string, ok: boolean, extra?: unknown) {
  if (!ok) failed += 1
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${!ok && extra !== undefined ? ` -> ${JSON.stringify(extra)}` : ''}`)
}

async function call(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let json: any = null
  try {
    json = JSON.parse(text)
  } catch {
    /* no es JSON */
  }
  return { status: res.status, json, text }
}

const codeNow = (secret: string, offset = 0) => hotp(secret, currentStep() + offset)

async function main() {
  const stamp = Date.now()
  const password = 'Prueba-e2e-2026!'

  // --- TOTP: vectores de los RFC 4226 / 6238 -----------------------------------
  const rfcSecret = base32Encode(Buffer.from('12345678901234567890'))
  check('HOTP RFC 4226 contador 0 = 755224', hotp(rfcSecret, 0) === '755224')
  check('HOTP RFC 4226 contador 9 = 520489', hotp(rfcSecret, 9) === '520489')
  check('TOTP RFC 6238 T=59s = 287082', hotp(rfcSecret, currentStep(59_000)) === '287082')
  check('TOTP RFC 6238 T=1111111109s = 081804', hotp(rfcSecret, currentStep(1111111109_000)) === '081804')

  // --- Registro ---------------------------------------------------------------
  const terms = await call('GET', '/terms/current')
  check('hay términos publicados', terms.status === 200, terms.json)
  const termsVersion = terms.json?.version ?? '1.2'
  const email = `E2E.Compliance.${stamp}@test.local`
  const base = { name: 'Prueba Cumplimiento', email, password, signedName: 'Prueba Cumplimiento', termsVersion }

  const noAccept = await call('POST', '/auth/register', base)
  check('registro SIN casilla de términos se rechaza (400)', noAccept.status === 400, noAccept.json)

  const reg = await call('POST', '/auth/register', { ...base, acceptTerms: true, marketingOptIn: true })
  check('registro sin teléfono y con casilla marcada (201)', reg.status === 201, reg.json)
  let token: string = reg.json?.token
  const userId: string = reg.json?.user?.id
  const tenantId: string = reg.json?.user?.tenantId
  check('correo guardado en minúsculas', reg.json?.user?.email === email.toLowerCase())
  check('marketingOptIn registrado', reg.json?.user?.marketingOptIn === true)

  const acceptance = await prisma.termsAcceptance.findFirst({ where: { userId } })
  check(
    'constancia de términos: correo, versión, huella, navegador, fecha',
    Boolean(
      acceptance &&
        acceptance.email === email.toLowerCase() &&
        acceptance.version === termsVersion &&
        acceptance.contentHash?.length === 64 &&
        acceptance.userAgent &&
        acceptance.acceptedAt,
    ),
    acceptance,
  )
  const consent = await prisma.consentEvent.findFirst({ where: { userId } })
  check('consentimiento de marketing registrado aparte', consent?.granted === true && consent.source === 'register')

  // --- Baja de correos ----------------------------------------------------------
  const badUnsub = await call('POST', '/site/unsubscribe', { token: 'x.y.z' })
  check('baja con token inválido (400)', badUnsub.status === 400)
  const sessionAsUnsub = await call('POST', '/site/unsubscribe', { token })
  check('un token de sesión no sirve para dar de baja (400)', sessionAsUnsub.status === 400)
  const unsubToken = signPurposeToken('unsubscribe', { uid: userId })
  const unsubAsSession = await call('GET', '/auth/me', undefined, unsubToken)
  check('un token de baja no sirve como sesión (401)', unsubAsSession.status === 401)
  const unsub = await call('POST', `/site/unsubscribe?token=${unsubToken}`)
  check('baja con un clic (token en query)', unsub.status === 200 && unsub.json?.ok === true, unsub.json)
  const afterUnsub = await prisma.user.findUnique({ where: { id: userId } })
  check('marketingOptIn apagado tras la baja', afterUnsub?.marketingOptIn === false && Boolean(afterUnsub.marketingOptOutAt))
  const reopt = await call('PATCH', '/account/marketing', { optIn: true }, token)
  check('volver a aceptar marketing desde Mi cuenta', reopt.status === 200 && reopt.json?.marketingOptIn === true)

  // --- 2FA ------------------------------------------------------------------------
  const badSetup = await call('POST', '/account/2fa/setup', { password: 'incorrecta' }, token)
  check('configurar 2FA con contraseña incorrecta (401)', badSetup.status === 401)
  const setup = await call('POST', '/account/2fa/setup', { password }, token)
  check('configurar 2FA devuelve secreto y URI', setup.status === 200 && /^otpauth:\/\/totp\//.test(setup.json?.otpauthUrl), setup.json)
  const secret: string = setup.json.secret
  const stored = await prisma.user.findUnique({ where: { id: userId } })
  check('secreto guardado cifrado (no en claro)', Boolean(stored?.totpSecret?.startsWith('v1:')) && !stored!.totpSecret!.includes(secret))

  const loginPending = await call('POST', '/auth/login', { email, password })
  check('2FA sin confirmar no bloquea el inicio de sesión', loginPending.status === 200 && Boolean(loginPending.json?.token))

  const badEnable = await call('POST', '/account/2fa/enable', { code: '000000' }, token)
  check('activar 2FA con código incorrecto (401)', badEnable.status === 401)
  const enable = await call('POST', '/account/2fa/enable', { code: codeNow(secret) }, token)
  check('activar 2FA entrega 10 códigos de recuperación', enable.status === 200 && enable.json?.recoveryCodes?.length === 10, enable.json)
  const recovery: string[] = enable.json.recoveryCodes

  const login = await call('POST', '/auth/login', { email: email.toUpperCase(), password })
  check('login con 2FA pide segundo paso y NO entrega sesión', login.json?.twoFactorRequired === true && !login.json?.token, login.json)
  const challenge: string = login.json.challengeToken
  const challengeAsSession = await call('GET', '/auth/me', undefined, challenge)
  check('el reto de 2FA no sirve como sesión (401)', challengeAsSession.status === 401)
  const replay = await call('POST', '/auth/login/2fa', { challengeToken: challenge, code: codeNow(secret) })
  check('código ya usado se rechaza (401)', replay.status === 401, replay.json)
  const wrong = await call('POST', '/auth/login/2fa', { challengeToken: challenge, code: '123123' })
  check('código incorrecto se rechaza (401)', wrong.status === 401)
  const next = await call('POST', '/auth/login/2fa', { challengeToken: challenge, code: codeNow(secret, 1) })
  check('código vigente (siguiente paso) abre sesión', next.status === 200 && Boolean(next.json?.token), next.json)
  const rec = await call('POST', '/auth/login/2fa', { challengeToken: challenge, code: recovery[0] })
  check('código de recuperación abre sesión', rec.status === 200 && rec.json?.usedRecoveryCode === true, rec.json)
  token = rec.json.token
  const recAgain = await call('POST', '/auth/login/2fa', { challengeToken: challenge, code: recovery[0] })
  check('código de recuperación no se puede reutilizar (401)', recAgain.status === 401)
  const sec = await call('GET', '/account/security', undefined, token)
  check('estado de seguridad: activo, 9 códigos', sec.json?.twoFactorEnabled === true && sec.json?.recoveryCodesLeft === 9, sec.json)

  // --- Exportar -----------------------------------------------------------------
  // Datos con llaves RESTRICT para probar que el borrado completo no se atora.
  const brand = await prisma.brand.create({ data: { tenantId, name: 'Marca E2E', slug: `marca-e2e-${stamp}` } })
  const product = await prisma.product.create({ data: { brandId: brand.id, name: 'Producto E2E', sku: 'E2E-1' } })
  await prisma.customer.create({ data: { tenantId, name: 'Cliente E2E', phone: '6180000000' } })
  await prisma.sale.create({
    data: {
      tenantId,
      ticketNumber: 1,
      paymentMethod: 'EFECTIVO',
      total: 100,
      subtotal: 100,
      createdById: userId,
      lines: { create: [{ productId: product.id, quantity: 1, unitPrice: 100, subtotal: 100, total: 100 }] },
    },
  })
  await prisma.productRequest.create({
    data: { tenantId, brandId: brand.id, requestedById: userId, type: 'RESTOCK', productId: product.id, quantity: 1 },
  })

  const exp = await call('GET', '/account/export', undefined, token)
  const dump = exp.json
  check('exportación descarga JSON del negocio', exp.status === 200 && dump?.alcance === 'negocio', exp.status)
  check('exportación incluye ventas, clientes y productos', dump?.datos?.ventas?.length === 1 && dump?.datos?.clientes?.length === 1 && dump?.datos?.productos?.length === 1)
  check('exportación sin contraseña ni secretos', !/"password"|totpSecret|totpRecoveryCodes|accessToken/.test(exp.text))
  const expAnon = await call('GET', '/account/export')
  check('exportación exige sesión (401)', expAnon.status === 401)

  // --- Eliminar cuenta ----------------------------------------------------------
  const delNoConfirm = await call('POST', '/account/delete', { password, confirm: 'eliminar' }, token)
  check('eliminar sin escribir ELIMINAR (400)', delNoConfirm.status === 400)
  const delNoCode = await call('POST', '/account/delete', { password, confirm: 'ELIMINAR' }, token)
  check('eliminar con 2FA activo exige código (400)', delNoCode.status === 400 && delNoCode.json?.code === 'TWO_FACTOR_REQUIRED', delNoCode.json)
  const delBadPass = await call('POST', '/account/delete', { password: 'x', confirm: 'ELIMINAR', code: recovery[1] }, token)
  check('eliminar con contraseña incorrecta (401)', delBadPass.status === 401)
  const stillThere = await prisma.tenant.findUnique({ where: { id: tenantId } })
  check('los intentos fallidos no borran nada', Boolean(stillThere))
  const del = await call('POST', '/account/delete', { password, confirm: 'ELIMINAR', code: recovery[1] }, token)
  check('eliminar cuenta y negocio', del.status === 200 && del.json?.scope === 'business', del.json)

  const gone = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.sale.count({ where: { tenantId } }),
    prisma.customer.count({ where: { tenantId } }),
    prisma.product.count({ where: { brandId: brand.id } }),
  ])
  check('negocio, usuario, ventas, clientes y productos borrados', !gone[0] && !gone[1] && gone[2] === 0 && gone[3] === 0 && gone[4] === 0, gone)
  const evidence = await prisma.termsAcceptance.findFirst({ where: { email: email.toLowerCase() } })
  check('se conserva la constancia de términos, desvinculada', Boolean(evidence && evidence.userId === null && evidence.userDeletedAt))
  const log = await prisma.accountDeletionLog.findFirst({ where: { email: email.toLowerCase() } })
  check('bitácora de eliminación registrada', log?.reason === 'user_request' && log.scope === 'TENANT')
  const meAfter = await call('GET', '/auth/me', undefined, token)
  check('la sesión anterior deja de servir (401)', meAfter.status === 401)
  const loginAfter = await call('POST', '/auth/login', { email, password })
  check('ya no se puede iniciar sesión (401)', loginAfter.status === 401)

  // --- Panel de plataforma --------------------------------------------------------
  const saEmail = `e2e-super-${stamp}@test.local`
  const sa = await prisma.user.create({
    data: { email: saEmail, password: await bcrypt.hash(password, 10), name: 'Super E2E', role: 'SUPER_ADMIN', onboardingStep: 'DONE' },
  })
  const previousTrackers = await prisma.platformSetting.findUnique({ where: { key: 'trackers' } })
  let promoId: string | null = null
  let claimId: string | null = null
  try {
    const saLogin = await call('POST', '/auth/login', { email: saEmail, password })
    let saToken: string = saLogin.json?.token
    check('SUPER_ADMIN sin 2FA inicia sesión pero queda marcado como requerido', saLogin.json?.user?.twoFactorRequired === true && saLogin.json?.user?.twoFactorEnabled === false)
    const blocked = await call('GET', '/platform/stats', undefined, saToken)
    check('plataforma bloqueada sin 2FA (403)', blocked.status === 403 && blocked.json?.code === 'TWO_FACTOR_SETUP_REQUIRED', blocked.json)
    const saSetup = await call('POST', '/account/2fa/setup', { password }, saToken)
    const saSecret: string = saSetup.json.secret
    const saEnable = await call('POST', '/account/2fa/enable', { code: codeNow(saSecret) }, saToken)
    check('SUPER_ADMIN activa 2FA', saEnable.status === 200)
    const stats = await call('GET', '/platform/stats', undefined, saToken)
    check('plataforma disponible con 2FA', stats.status === 200 && typeof stats.json?.tenants === 'number', stats.json)
    const saLogin2 = await call('POST', '/auth/login', { email: saEmail, password })
    check('SUPER_ADMIN: el login ya exige código', saLogin2.json?.twoFactorRequired === true && !saLogin2.json?.token)
    const sa2 = await call('POST', '/auth/login/2fa', { challengeToken: saLogin2.json.challengeToken, code: codeNow(saSecret, 1) })
    check('SUPER_ADMIN entra con código de authenticator', sa2.status === 200 && Boolean(sa2.json?.token), sa2.json)
    saToken = sa2.json.token

    const analytics = await call('GET', '/platform/analytics', undefined, saToken)
    check('analítica: 12 meses, embudo y suscripciones', analytics.status === 200 && analytics.json?.months?.length === 12 && analytics.json?.funnel?.length === 6, analytics.json)

    const code = `E2E${stamp}`.slice(0, 20)
    const promo = await call('POST', '/platform/promo-codes', { code: code.toLowerCase(), extraTrialDays: 10, maxUses: 5 }, saToken)
    promoId = promo.json?.id ?? null
    check('crear código de promoción (en mayúsculas)', promo.status === 201 && promo.json?.code === code, promo.json)
    const dup = await call('POST', '/platform/promo-codes', { code, extraTrialDays: 10 }, saToken)
    check('código duplicado (409)', dup.status === 409)
    const off = await call('PATCH', `/platform/promo-codes/${promoId}`, { active: false }, saToken)
    check('desactivar código', off.json?.active === false)
    const on = await call('PATCH', `/platform/promo-codes/${promoId}`, { active: true, expiresAt: new Date(Date.now() - 1000).toISOString() }, saToken)
    check('activar código y ponerle vencimiento', on.json?.active === true && Boolean(on.json?.expiresAt))
    const list = await call('GET', '/platform/promo-codes', undefined, saToken)
    check('listar códigos', Array.isArray(list.json) && list.json.some((c: any) => c.id === promoId))
    const rm = await call('DELETE', `/platform/promo-codes/${promoId}`, undefined, saToken)
    check('quitar código', rm.status === 200)
    promoId = null

    const badTrackers = await call('PUT', '/platform/settings/trackers', { ga4: { enabled: true, id: 'UA-123' }, metaPixel: { enabled: false, id: '' }, hotjar: { enabled: false, id: '' } }, saToken)
    check('ID de rastreador inválido (400)', badTrackers.status === 400, badTrackers.json)
    const okTrackers = await call('PUT', '/platform/settings/trackers', { ga4: { enabled: true, id: 'G-TEST12345' }, metaPixel: { enabled: false, id: '123456789012345' }, hotjar: { enabled: false, id: '' } }, saToken)
    check('guardar rastreadores', okTrackers.status === 200)
    const pub = await call('GET', '/site/config')
    check('el sitio público solo ve los rastreadores activos', pub.json?.trackers?.ga4Id === 'G-TEST12345' && pub.json?.trackers?.metaPixelId === null, pub.json)

    const claimBad = await call('POST', '/site/copyright-claims', { claimantName: 'Ana', claimantEmail: 'ana@test.local' })
    check('reclamo incompleto (400)', claimBad.status === 400)
    const claim = await call('POST', '/site/copyright-claims', {
      claimantName: 'Ana Titular', claimantEmail: 'ana@test.local', rightsHolder: 'Ana Titular',
      workDescription: 'Fotografía de producto de mi autoría', infringingUrl: 'https://cosdi.mx/reservar/ejemplo',
      goodFaith: true, accuracy: true, signature: 'Ana Titular',
    })
    claimId = claim.json?.id ?? null
    check('reclamo de derechos de autor recibido (201)', claim.status === 201 && Boolean(claimId), claim.json)
    const claims = await call('GET', '/platform/legal/copyright-claims', undefined, saToken)
    check('el reclamo aparece en el panel', claims.json?.items?.some((c: any) => c.id === claimId))
    const resolve = await call('PATCH', `/platform/legal/copyright-claims/${claimId}`, { status: 'RESOLVED', adminNote: 'Prueba' }, saToken)
    check('marcar reclamo como resuelto', resolve.json?.status === 'RESOLVED' && Boolean(resolve.json?.resolvedAt))

    const acc = await call('GET', `/platform/legal/acceptances?q=${encodeURIComponent(email.toLowerCase())}`, undefined, saToken)
    check('panel: quién aceptó los términos y cuándo', acc.json?.items?.length === 1 && acc.json.items[0].email === email.toLowerCase(), acc.json)
    const dels = await call('GET', '/platform/legal/deletions', undefined, saToken)
    check('panel: bitácora de eliminaciones', dels.json?.items?.some((d: any) => d.email === email.toLowerCase()))
    const ret = await call('GET', '/platform/retention', undefined, saToken)
    check('panel: política de conservación', ret.status === 200 && ret.json?.policy?.inactiveAccountMonths === 12, ret.json)

    const biz = await call('GET', '/platform/stats', undefined, token)
    check('un token de negocio (ya eliminado) no entra a plataforma', biz.status === 401 || biz.status === 403)
  } finally {
    if (promoId) await prisma.promoCode.delete({ where: { id: promoId } }).catch(() => undefined)
    if (claimId) await prisma.copyrightClaim.delete({ where: { id: claimId } }).catch(() => undefined)
    if (previousTrackers) {
      await prisma.platformSetting.update({ where: { key: 'trackers' }, data: { value: previousTrackers.value as object } })
    } else {
      await prisma.platformSetting.deleteMany({ where: { key: 'trackers' } })
    }
    await prisma.user.delete({ where: { id: sa.id } }).catch(() => undefined)
    await prisma.termsAcceptance.deleteMany({ where: { email: email.toLowerCase() } })
    await prisma.consentEvent.deleteMany({ where: { email: email.toLowerCase() } })
    await prisma.accountDeletionLog.deleteMany({ where: { email: email.toLowerCase() } })
  }

  console.log(failed === 0 ? '\nTODO OK' : `\n${failed} PRUEBA(S) FALLARON`)
  process.exitCode = failed === 0 ? 0 : 1
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
