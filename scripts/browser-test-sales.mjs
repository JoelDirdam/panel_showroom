import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE = 'http://localhost:5173'
const OUT = path.join(__dirname, 'browser-test-results-sales')
fs.mkdirSync(OUT, { recursive: true })

const results = []
function ok(name, detail = '') {
  results.push({ name, pass: true, detail })
  console.log(`PASS: ${name}${detail ? ' — ' + detail : ''}`)
}
function fail(name, detail = '') {
  results.push({ name, pass: false, detail })
  console.error(`FAIL: ${name}${detail ? ' — ' + detail : ''}`)
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`)
  await page.getByPlaceholder('Ingresa tu email').fill(email)
  await page.getByPlaceholder('Ingresa tu contraseña').fill(password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

try {
  await login(page, 'admin@showroom.com', 'Showroom2026!')
  ok('Login admin')

  await page.goto(`${BASE}/sales`)
  await page.waitForSelector('text=Registro de ventas', { timeout: 15000 })
  await page.screenshot({ path: path.join(OUT, '01-sales-page.png'), fullPage: true })
  ok('Página Ventas/Tickets carga')

  for (const col of [
    'ID',
    'Producto',
    'Cantidad',
    'SUBT',
    'Descuento',
    'Comisión',
    'Total',
    'Fecha',
    'Método de pago',
    'En corte',
    'Pagado',
  ]) {
    const visible = await page.locator('th', { hasText: col }).first().isVisible().catch(() => false)
    if (visible) ok(`Columna ${col}`)
    else fail(`Columna ${col}`, 'no visible')
  }

  if (await page.getByRole('button', { name: 'Registrar venta' }).isVisible()) ok('Botón Registrar venta')
  else fail('Botón Registrar venta')

  await page.getByRole('button', { name: 'Registrar venta' }).click()
  await page.waitForSelector('text=Guardar venta', { timeout: 10000 })
  await page.screenshot({ path: path.join(OUT, '02-create-modal.png'), fullPage: true })
  ok('Modal registrar venta')

  const productSelectsBox = page.locator('.rounded-lg.border.border-gray-200 select')
  const firstSelect = productSelectsBox.first()
  const optionValues = await firstSelect.locator('option').evaluateAll((opts) =>
    opts
      .map((o) => ({ value: o.value, text: o.textContent || '' }))
      .filter((o) => o.value && !o.text.includes('stock 0')),
  )
  if (optionValues.length < 2) {
    fail('Producto seleccionado en línea 1', `solo ${optionValues.length} productos con stock`)
  } else {
    await firstSelect.selectOption(optionValues[0].value)
    ok('Producto seleccionado en línea 1', optionValues[0].text.trim())

    await page.getByRole('button', { name: 'Agregar producto' }).click()
    const secondSelect = page.locator('.rounded-lg.border.border-gray-200 select').nth(1)
    await secondSelect.selectOption(optionValues[1].value)
    ok('Segunda línea de producto agregada', optionValues[1].text.trim())
  }

  await page.getByRole('button', { name: 'Guardar venta' }).click()
  try {
    await page.waitForSelector('button:has-text("Guardar venta")', { state: 'detached', timeout: 10000 })
    ok('Venta guardada desde UI')
  } catch {
    const errText = await page.locator('.text-error-500').textContent().catch(() => '')
    fail('Venta guardada desde UI', errText || 'modal aún abierto')
    await page.screenshot({ path: path.join(OUT, '99-error.png'), fullPage: true })
  }

  await page.screenshot({ path: path.join(OUT, '03-after-create.png'), fullPage: true })

  // Brand user
  await page.evaluate(() => localStorage.clear())
  await login(page, 'marca@bubbles.com', 'Showroom2026!')
  await page.goto(`${BASE}/sales`)
  await page.waitForSelector('text=Registro de ventas', { timeout: 15000 })
  const createBtn = await page.getByRole('button', { name: 'Registrar venta' }).isVisible().catch(() => false)
  if (!createBtn) ok('BRAND sin botón Registrar venta')
  else fail('BRAND sin botón Registrar venta', 'botón visible')
  await page.screenshot({ path: path.join(OUT, '04-brand-sales.png'), fullPage: true })
} catch (e) {
  fail('Fatal', e.message)
  await page.screenshot({ path: path.join(OUT, '99-fatal.png'), fullPage: true }).catch(() => {})
} finally {
  await browser.close()
  const summary = {
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
    results,
  }
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2))
  console.log(`\nSummary: ${summary.passed} passed, ${summary.failed} failed`)
  if (summary.failed > 0) process.exit(1)
}
