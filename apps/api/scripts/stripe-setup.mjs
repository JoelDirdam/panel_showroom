// Prepara Stripe para un entorno de COSDI y guarda la configuración en Railway.
// No imprime ni escribe en disco ningún secreto: los pasa directo a `railway variable set --stdin`.
//
// Crea (si faltan): productos y precios de los planes (Citas; Negocio solo en prueba), tasa de IVA 16 %,
// configuración del portal del cliente y el webhook de la API.
//
// Uso (desde apps/api, con la CLI de Railway enlazada al proyecto):
//   STRIPE_KEY=<clave secreta de Stripe> node scripts/stripe-setup.mjs <entorno> <url-api> <url-app>
// Ejemplos:
//   node scripts/stripe-setup.mjs dev https://api-dev-xxxx.up.railway.app https://web-dev-xxxx.up.railway.app
//   node scripts/stripe-setup.mjs production https://api.cosdi.mx https://app.cosdi.mx
// El modo (prueba o real) lo define la clave: sk_test_... o sk_live_...
import Stripe from 'stripe'
import { spawnSync } from 'node:child_process'

const [envName, apiBase, appUrl] = process.argv.slice(2)
const key = process.env.STRIPE_KEY
if (!key || !envName || !apiBase || !appUrl) {
  console.error('Uso: STRIPE_KEY=... node scripts/stripe-setup.mjs <entorno> <url-api> <url-app>')
  process.exit(1)
}
const live = key.includes('_live_')
if (envName === 'production' && !live) {
  console.error('Para production se necesita una clave real (sk_live_ o rk_live_).')
  process.exit(1)
}
const stripe = new Stripe(key)
console.log('modo:', live ? 'REAL' : 'prueba', '| entorno Railway:', envName)

const ALL_PLANS = [
  {
    // Por ahora solo en modo de prueba: en real no se crea hasta decidir su lanzamiento.
    testOnly: true,
    planType: 'NEGOCIO',
    name: 'COSDI Negocio',
    description: 'ERP y punto de venta: marcas, productos, stock, ventas, caja, cortes y agenda',
    amount: 69900,
  },
  {
    planType: 'CITAS_RECORDATORIOS',
    name: 'COSDI Recordatorios',
    description: 'Recordatorios de cita por WhatsApp',
    amount: 14900,
  },
  {
    planType: 'CITAS_PANEL',
    name: 'COSDI Citas',
    description: 'Panel de citas, link público de reserva, servicios y horarios, recordatorios por WhatsApp',
    amount: 34900,
  },
  {
    planType: 'CITAS_IA',
    name: 'COSDI Citas + IA',
    description:
      'Todo lo de Citas más asistente de IA que atiende y agenda por WhatsApp, chats en Kanban. Los créditos de IA se cobran aparte.',
    amount: 54900,
  },
]
const PLANS = ALL_PLANS.filter((p) => !(live && p.testOnly))

const EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
]

function setVar(name, value) {
  const r = spawnSync(
    'railway',
    ['variable', 'set', name, '--stdin', '--service', 'api', '--environment', envName, '--skip-deploys'],
    { input: value, encoding: 'utf8', shell: true },
  )
  console.log(`  ${name}: ${r.status === 0 ? 'guardada' : 'ERROR ' + (r.stderr || r.stdout).slice(0, 200)}`)
  if (r.status !== 0) process.exitCode = 1
}

// 1. Productos y precios (mensual, MXN, IVA incluido).
// Un precio con tax_behavior distinto de "inclusive" choca con la tasa de IVA incluida,
// así que se reemplaza por uno nuevo en el mismo producto y el anterior se archiva.
const prices = await stripe.prices.list({ active: true, limit: 100 })
const byPlan = {}
const stale = {}
for (const p of prices.data) {
  if (!p.metadata?.planType || p.recurring?.interval !== 'month') continue
  if (p.tax_behavior === 'inclusive') byPlan[p.metadata.planType] = p.id
  else stale[p.metadata.planType] = p
}
for (const plan of PLANS) {
  if (byPlan[plan.planType]) continue
  const priceData = {
    currency: 'mxn',
    unit_amount: plan.amount,
    recurring: { interval: 'month' },
    tax_behavior: 'inclusive',
    metadata: { planType: plan.planType },
  }
  const old = stale[plan.planType]
  if (old) {
    const productId = typeof old.product === 'string' ? old.product : old.product.id
    const price = await stripe.prices.create({ ...priceData, product: productId })
    await stripe.products.update(productId, { default_price: price.id })
    await stripe.prices.update(old.id, { active: false })
    byPlan[plan.planType] = price.id
    console.log('precio reemplazado (IVA incluido):', plan.name)
    continue
  }
  const product = await stripe.products.create({
    name: plan.name,
    description: plan.description,
    metadata: { planType: plan.planType },
    default_price_data: priceData,
  })
  byPlan[plan.planType] = typeof product.default_price === 'string' ? product.default_price : product.default_price.id
  console.log('producto creado:', plan.name)
}
console.log('precios:', byPlan)

// 2. Tasa de IVA 16 % incluida en el precio (el recibo la desglosa; el total no cambia)
const rates = await stripe.taxRates.list({ active: true, limit: 100 })
let rate = rates.data.find((r) => r.percentage === 16 && r.inclusive && r.country === 'MX')
if (!rate) {
  rate = await stripe.taxRates.create({
    display_name: 'IVA',
    description: 'IVA 16 % México',
    percentage: 16,
    inclusive: true,
    country: 'MX',
    jurisdiction: 'MX',
  })
  console.log('tasa de IVA creada:', rate.id)
} else console.log('tasa de IVA existente:', rate.id)

// 3. Portal del cliente (cambiar tarjeta, ver recibos, cancelar al final del periodo)
const base = appUrl.replace(/\/+$/, '')
const portals = await stripe.billingPortal.configurations.list({ active: true, limit: 100 })
let portal = portals.data.find((c) => c.metadata?.app === 'cosdi')
if (!portal) {
  portal = await stripe.billingPortal.configurations.create({
    metadata: { app: 'cosdi' },
    business_profile: {
      headline: 'Administra tu suscripción de COSDI',
      privacy_policy_url: `${base}/privacidad`,
      terms_of_service_url: `${base}/terminos`,
    },
    default_return_url: `${base}/suscripcion`,
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ['email', 'name', 'address', 'tax_id'] },
      subscription_cancel: { enabled: true, mode: 'at_period_end' },
    },
  })
  console.log('portal del cliente creado:', portal.id)
} else console.log('portal del cliente existente:', portal.id)

// 4. Webhook (se recrea para obtener su secreto de firma)
const url = `${apiBase.replace(/\/+$/, '')}/api/billing/webhook`
const hooks = await stripe.webhookEndpoints.list({ limit: 100 })
for (const h of hooks.data.filter((h) => h.url === url)) await stripe.webhookEndpoints.del(h.id)
const hook = await stripe.webhookEndpoints.create({ url, enabled_events: EVENTS, description: `COSDI ${envName}` })
console.log('webhook creado:', hook.id, url)

// 5. Variables en Railway
setVar('STRIPE_SECRET_KEY', key)
setVar('STRIPE_WEBHOOK_SECRET', hook.secret)
setVar('STRIPE_TAX_RATE_ID', rate.id)
setVar('STRIPE_PORTAL_CONFIG_ID', portal.id)
setVar('APP_URL', base)
for (const plan of PLANS) setVar(`STRIPE_PRICE_${plan.planType}`, byPlan[plan.planType])

console.log('\nListo. Falta redesplegar la API para que tome las variables:')
console.log(`  railway redeploy --service api --environment ${envName} --yes`)
