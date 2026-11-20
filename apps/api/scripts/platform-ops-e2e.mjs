/**
 * Prueba de punta a punta del panel de plataforma, solo por HTTP (sirve para
 * local y para el entorno dev de Railway). Crea un negocio de prueba y lo borra
 * al final. NUNCA la corras contra producción: se niega si la URL es la de prod.
 *
 * Variables:
 *   E2E_API_URL        p. ej. http://localhost:3000/api
 *   E2E_SA_EMAIL       SUPER_ADMIN de pruebas
 *   E2E_SA_PASSWORD
 *   E2E_SA_TOTP_SECRET (opcional) si ya tiene 2FA; si no, la prueba lo activa y lo imprime
 *   E2E_PUBLISH_TERMS  "1" para publicar de verdad una versión de prueba (solo local)
 *
 * Uso: node scripts/platform-ops-e2e.mjs
 */
import { createHmac } from 'node:crypto'

const API = (process.env.E2E_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '')
const SA_EMAIL = process.env.E2E_SA_EMAIL
const SA_PASSWORD = process.env.E2E_SA_PASSWORD
let totpSecret = process.env.E2E_SA_TOTP_SECRET || ''

if (/api\.cosdi\.mx/i.test(API)) {
  console.error('Esta prueba crea y borra datos: no se corre contra producción.')
  process.exit(1)
}
if (!SA_EMAIL || !SA_PASSWORD) {
  console.error('Define E2E_SA_EMAIL y E2E_SA_PASSWORD')
  process.exit(1)
}

let failed = 0
function check(name, ok, extra) {
  if (!ok) failed += 1
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${!ok && extra !== undefined ? ` -> ${JSON.stringify(extra).slice(0, 400)}` : ''}`)
}

async function call(method, path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* no JSON */
  }
  return { status: res.status, json }
}

// --- TOTP (RFC 6238) ----------------------------------------------------------
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
function b32decode(s) {
  let bits = 0
  let value = 0
  const out = []
  for (const c of s.toUpperCase().replace(/[^A-Z2-7]/g, '')) {
    value = (value << 5) | B32.indexOf(c)
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(out)
}
function totp(secret, offset = 0) {
  const counter = Math.floor(Date.now() / 30000) + offset
  const msg = Buffer.alloc(8)
  msg.writeBigUInt64BE(BigInt(counter))
  const d = createHmac('sha1', b32decode(secret)).update(msg).digest()
  const o = d[d.length - 1] & 0x0f
  const bin = ((d[o] & 0x7f) << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]
  return String(bin % 1_000_000).padStart(6, '0')
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Inicia sesión del SUPER_ADMIN; usa un paso de 30 s distinto en cada intento para no repetir código. */
let stepOffset = 0
async function superAdminLogin() {
  const login = await call('POST', '/auth/login', { email: SA_EMAIL, password: SA_PASSWORD })
  if (login.json?.token) return login.json.token
  if (!login.json?.twoFactorRequired || !totpSecret) throw new Error(`login SUPER_ADMIN: ${JSON.stringify(login.json)}`)
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const r = await call('POST', '/auth/login/2fa', { challengeToken: login.json.challengeToken, code: totp(totpSecret, stepOffset) })
    if (r.json?.token) {
      stepOffset += 1
      return r.json.token
    }
    stepOffset += 1
    await sleep(500)
  }
  throw new Error('No se pudo completar el 2FA del SUPER_ADMIN')
}

async function main() {
  const stamp = Date.now()

  // --- SUPER_ADMIN con 2FA ------------------------------------------------------
  let sa = await superAdminLogin()
  const me = await call('GET', '/auth/me', undefined, sa)
  check('SUPER_ADMIN autenticado', me.json?.role === 'SUPER_ADMIN', me.json)
  if (!me.json?.twoFactorEnabled) {
    const setup = await call('POST', '/account/2fa/setup', { password: SA_PASSWORD }, sa)
    totpSecret = setup.json?.secret
    const enable = await call('POST', '/account/2fa/enable', { code: totp(totpSecret) }, sa)
    check('SUPER_ADMIN activa 2FA', enable.status === 200, enable.json)
    console.log(`     (secreto 2FA de la cuenta de prueba: ${totpSecret})`)
    stepOffset = 1
    sa = await superAdminLogin()
  }
  check('login del SUPER_ADMIN con código', Boolean(sa))

  // --- Estado, ingresos y términos ---------------------------------------------
  const health = await call('GET', '/platform/health', undefined, sa)
  check('estado de salud responde', health.status === 200 && Array.isArray(health.json?.checks), health.json)
  check('estado: base de datos OK', health.json?.checks?.find((c) => c.key === 'db')?.status === 'ok', health.json?.checks)
  console.log('     estado:', health.json?.status, '|', (health.json?.checks ?? []).map((c) => `${c.key}=${c.status}`).join(' '))
  const healthText = JSON.stringify(health.json)
  check('estado no expone claves secretas', !/sk_(live|test)_|whsec_|re_[A-Za-z0-9]{10}/.test(healthText))

  const revenue = await call('GET', '/platform/revenue?refresh=1', undefined, sa)
  check('ingresos de Stripe responden', revenue.status === 200 && typeof revenue.json?.configured === 'boolean', revenue.json)
  if (revenue.json?.configured) {
    check('ingresos: 12 meses y MRR', revenue.json.months?.length === 12 && typeof revenue.json.mrr === 'number', revenue.json)
    console.log(`     Stripe ${revenue.json.mode}: MRR ${revenue.json.mrr}, neto 12m ${revenue.json.totals?.net12m}`)
  }

  const terms = await call('GET', '/platform/terms', undefined, sa)
  check('términos: versiones y borrador', terms.status === 200 && Array.isArray(terms.json?.versions) && terms.json?.draft?.version, terms.json)
  const currentVersion = terms.json?.current?.version ?? '0'
  const noConfirm = await call('POST', '/platform/terms', { version: '99.0', title: 'Prueba de validación', summary: 'Solo validación', content: 'x'.repeat(300) }, sa)
  check('publicar sin confirmar se rechaza (400)', noConfirm.status === 400, noConfirm.json)
  const lower = await call('POST', '/platform/terms', { version: '0.0.1', title: 'Prueba de validación', summary: 'Solo validación', content: 'x'.repeat(300), confirm: true }, sa)
  check('publicar una versión menor se rechaza (400/409)', lower.status === 400 || lower.status === 409, lower.json)
  if (currentVersion !== '0') {
    const dup = await call('POST', '/platform/terms', { version: currentVersion, title: 'Prueba', summary: 'Solo validación', content: 'x'.repeat(300), confirm: true }, sa)
    check('republicar la versión vigente se rechaza (409)', dup.status === 409, dup.json)
  }
  if (process.env.E2E_PUBLISH_TERMS === '1') {
    const v = `${currentVersion}.${stamp % 1000}9`
    const pub = await call('POST', '/platform/terms', { version: v, title: 'Términos de prueba E2E', summary: 'Versión de prueba creada por la prueba automática.', content: `PRUEBA ${stamp}\n${'texto '.repeat(60)}`, confirm: true, notifyUsers: false }, sa)
    check('publicar versión nueva (201)', pub.status === 201, pub.json)
    const cur = await call('GET', '/terms/current')
    check('la versión publicada pasa a ser la vigente', cur.json?.version === v && cur.json?.summary?.includes('prueba automática'), cur.json)
    console.log(`     E2E_TERMS_VERSION=${v}`)
  }

  // --- Negocio de prueba --------------------------------------------------------
  const termsCurrent = await call('GET', '/terms/current')
  const email = `e2e-plataforma-${stamp}@example.com`
  const password = 'Prueba-e2e-2026!'
  const reg = await call('POST', '/auth/register', {
    name: 'Prueba Plataforma',
    email,
    password,
    signedName: 'Prueba Plataforma',
    termsVersion: termsCurrent.json?.version ?? '',
    acceptTerms: true,
    marketingOptIn: false,
  })
  check('registro de negocio de prueba', reg.status === 201, reg.json)
  let biz = reg.json?.token
  const tenantId = reg.json?.user?.tenantId
  const plan = await call('POST', '/onboarding/select-plan', { planType: 'CITAS_PANEL' }, biz)
  check('el negocio elige plan (prueba)', plan.status === 200 && plan.json?.user?.subscription?.status === 'TRIALING', plan.json)
  const trialBefore = new Date(plan.json?.user?.subscription?.trialEndsAt)

  try {
    // Extender prueba
    const badDays = await call('POST', `/platform/tenants/${tenantId}/extend-trial`, { days: 0 }, sa)
    check('extender 0 días se rechaza (400)', badDays.status === 400, badDays.json)
    const ext = await call('POST', `/platform/tenants/${tenantId}/extend-trial`, { days: 10, reason: 'Prueba E2E' }, sa)
    const diffDays = (new Date(ext.json?.trialEndsAt) - trialBefore) / 86400000
    check('extender la prueba 10 días', ext.status === 200 && Math.round(diffDays) === 10, { ext: ext.json, diffDays })
    const bizMe = await call('GET', '/auth/me', undefined, biz)
    check('el negocio ve la nueva fecha', bizMe.json?.subscription?.trialEndsAt === ext.json?.trialEndsAt, bizMe.json?.subscription)

    // Suspender
    const noReason = await call('POST', `/platform/tenants/${tenantId}/suspend`, { reason: 'x' }, sa)
    check('suspender sin motivo se rechaza (400)', noReason.status === 400, noReason.json)
    const sus = await call('POST', `/platform/tenants/${tenantId}/suspend`, { reason: 'Prueba automática de suspensión', notify: false }, sa)
    check('suspender negocio', sus.status === 200, sus.json)
    const again = await call('POST', `/platform/tenants/${tenantId}/suspend`, { reason: 'Prueba automática', notify: false }, sa)
    check('suspender dos veces (409)', again.status === 409, again.json)
    const blocked = await call('GET', '/dashboard', undefined, biz)
    check('negocio suspendido: el panel responde ACCOUNT_SUSPENDED', blocked.status === 403 && blocked.json?.code === 'ACCOUNT_SUSPENDED', blocked.json)
    const meSus = await call('GET', '/auth/me', undefined, biz)
    check('/auth/me marca la suspensión y el motivo', meSus.json?.tenant?.suspended === true && meSus.json?.tenant?.suspendedReason?.includes('Prueba'), meSus.json?.tenant)
    const privacy = await call('GET', '/account/privacy', undefined, biz)
    check('suspendido: puede ver sus datos (Mi cuenta)', privacy.status === 200, privacy.json)
    const exp = await call('GET', '/account/export', undefined, biz)
    check('suspendido: puede descargar sus datos', exp.status === 200)
    const checkout = await call('POST', '/billing/checkout', {}, biz)
    check('suspendido: no puede iniciar un cobro (403)', checkout.status === 403, checkout.json)
    const relogin = await call('POST', '/auth/login', { email, password })
    biz = relogin.json?.token
    check('suspendido: puede iniciar sesión (ve el aviso)', Boolean(biz), relogin.json)

    // Reactivar
    const re = await call('POST', `/platform/tenants/${tenantId}/reactivate`, { notify: false }, sa)
    check('reactivar negocio', re.status === 200, re.json)
    const after = await call('GET', '/dashboard', undefined, biz)
    check('reactivado: ya no está suspendido', after.json?.code !== 'ACCOUNT_SUSPENDED', after.json)

    // Cuenta de prueba
    const termsBefore = await call('GET', '/platform/terms', undefined, sa)
    const badFlag = await call('POST', `/platform/tenants/${tenantId}/test-flag`, { isTest: 'si' }, sa)
    check('marca de prueba con valor inválido (400)', badFlag.status === 400, badFlag.json)
    const mark = await call('POST', `/platform/tenants/${tenantId}/test-flag`, { isTest: true }, sa)
    check('marcar como cuenta de prueba', mark.status === 200 && mark.json?.isTest === true, mark.json)
    const list = await call('GET', '/platform/tenants', undefined, sa)
    const row = (list.json ?? []).find((t) => t.id === tenantId)
    check('la cuenta de prueba sigue en la lista del panel, marcada', row?.isTest === true, row)
    const termsAfter = await call('GET', '/platform/terms', undefined, sa)
    const rb = termsBefore.json?.recipients
    const ra = termsAfter.json?.recipients
    check(
      'avisos de términos: la cuenta de prueba pasa de "reales" a "prueba"',
      rb && ra && ra.real + ra.test === rb.real + rb.test && ra.test >= rb.test && ra.real <= rb.real,
      { rb, ra },
    )
    const bizFlag = await call('POST', `/platform/tenants/${tenantId}/test-flag`, { isTest: false }, biz)
    check('un negocio no puede cambiar la marca de prueba', bizFlag.status === 401 || bizFlag.status === 403, bizFlag.status)
    const unmark = await call('POST', `/platform/tenants/${tenantId}/test-flag`, { isTest: false }, sa)
    check('quitar la marca de prueba', unmark.status === 200 && unmark.json?.isTest === false, unmark.json)

    // Bitácora
    const log = await call('GET', `/platform/audit-log?targetId=${tenantId}`, undefined, sa)
    const actions = (log.json?.items ?? []).map((e) => e.action)
    check(
      'bitácora: extender, suspender, reactivar y marca de prueba quedaron registrados',
      ['tenant.extend_trial', 'tenant.suspend', 'tenant.reactivate', 'tenant.mark_test', 'tenant.unmark_test'].every((a) =>
        actions.includes(a),
      ),
      actions,
    )
    const logins = await call('GET', '/platform/audit-log?action=auth.', undefined, sa)
    check('bitácora: inicio de sesión del SUPER_ADMIN', (logins.json?.items ?? []).some((e) => e.actorEmail === SA_EMAIL.toLowerCase() || e.targetLabel === SA_EMAIL.toLowerCase()), logins.json?.items?.slice(0, 2))
    const bizAudit = await call('GET', '/platform/audit-log', undefined, biz)
    check('un negocio no puede leer la bitácora', bizAudit.status === 401 || bizAudit.status === 403, bizAudit.status)
  } finally {
    // Limpieza: borra el negocio de prueba.
    const detail = await call('GET', `/platform/tenants/${tenantId}`, undefined, sa)
    const del = await call('DELETE', `/platform/tenants/${tenantId}?confirm=${encodeURIComponent(detail.json?.slug ?? '')}`, undefined, sa)
    check('limpieza: negocio de prueba eliminado', del.status === 200, del.json)
  }

  console.log(failed === 0 ? '\nTODO OK' : `\n${failed} PRUEBA(S) FALLARON`)
  process.exitCode = failed === 0 ? 0 : 1
}

main().catch((e) => {
  console.error(e)
  process.exitCode = 1
})
