import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE = 'http://localhost:5173'
const OUT = path.join(__dirname, 'browser-test-results')
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
  await page.screenshot({ path: path.join(OUT, '01-admin-home.png'), fullPage: true })
  ok('Login admin')

  await page.goto(`${BASE}/products`)
  await page.waitForSelector('text=Filtrar Productos', { timeout: 15000 })
  await page.screenshot({ path: path.join(OUT, '02-products-page.png'), fullPage: true })
  ok('Página Productos carga con card Filtrar Productos')

  for (const col of ['SKU', 'Nombre', 'Stock', 'Cantidad actual', 'Precio']) {
    const visible = await page.locator('th', { hasText: col }).first().isVisible().catch(() => false)
    if (visible) ok(`Columna ${col}`)
    else fail(`Columna ${col}`, 'no visible')
  }

  if (await page.getByRole('button', { name: 'Agregar productos' }).isVisible()) ok('Botón Agregar productos')
  else fail('Botón Agregar productos')
  if (await page.getByRole('button', { name: 'Agregar Stock' }).isVisible()) ok('Botón Agregar Stock')
  else fail('Botón Agregar Stock')
  if (await page.getByRole('button', { name: 'Aplicar Filtros' }).isVisible()) ok('Botón Aplicar Filtros')
  else fail('Botón Aplicar Filtros')

  await page.getByPlaceholder('Buscar por nombre').fill('Jab')
  await page.getByRole('button', { name: 'Aplicar Filtros' }).click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(OUT, '03-filter-name.png'), fullPage: true })
  const rowsAfterFilter = await page.locator('tbody tr').count()
  ok('Filtro por nombre aplicado', `${rowsAfterFilter} filas`)

  await page.getByPlaceholder('Buscar por nombre').fill('')
  await page.getByRole('button', { name: 'Aplicar Filtros' }).click()
  await page.waitForTimeout(800)

  const viewEdit = page.getByRole('button', { name: 'Ver/Editar' }).first()
  if (await viewEdit.count()) {
    await viewEdit.click()
    await page.waitForSelector('text=Ver/Editar producto', { timeout: 10000 })
    await page.waitForSelector('text=Entradas de stock', { timeout: 5000 })
    await page.screenshot({ path: path.join(OUT, '04-view-edit.png'), fullPage: true })
    ok('Card Ver/Editar con entradas de stock')

    const barcodeInput = page.locator('label:has-text("Cod. Barras")').locator('..').locator('input').first()
    await barcodeInput.fill('TEST-LOCAL-BARCODE')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await page.waitForTimeout(1000)
    ok('Guardar cambios en Ver/Editar')
  } else {
    fail('Ver/Editar', 'no hay botones')
  }

  await page.getByRole('button', { name: 'Agregar Stock' }).click()
  const stockModal = page.locator('div.fixed').filter({ has: page.locator('h3:has-text("Agregar Stock")') })
  await stockModal.waitFor({ timeout: 5000 })
  await stockModal.locator('label:has-text("Cantidad")').locator('..').locator('input').fill('2')
  await stockModal.locator('label:has-text("Nota")').locator('..').locator('input').fill('prueba browser local')
  await stockModal.getByRole('button', { name: 'Agregar' }).click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: path.join(OUT, '05-after-add-stock.png'), fullPage: true })
  ok('Agregar Stock desde modal')

  await page.getByRole('button', { name: 'Agregar productos' }).click()
  const createModal = page.locator('div.fixed').filter({ has: page.locator('h3:has-text("Agregar productos")') })
  await createModal.waitFor({ timeout: 5000 })
  await page.screenshot({ path: path.join(OUT, '06-add-product-modal.png'), fullPage: true })
  ok('Modal Agregar productos')
  await createModal.getByRole('button', { name: 'Cancelar' }).click()

  await page.evaluate(() => localStorage.clear())
  await login(page, 'marca@bubbles.com', 'Showroom2026!')
  await page.goto(`${BASE}/products`)
  await page.waitForSelector('text=Filtrar Productos', { timeout: 15000 })
  await page.screenshot({ path: path.join(OUT, '07-brand-products.png'), fullPage: true })
  const brandRows = await page.locator('tbody tr').count()
  ok('Login marca y productos', `${brandRows} filas`)
} catch (err) {
  fail('Excepción no controlada', String(err))
  await page.screenshot({ path: path.join(OUT, '99-error.png'), fullPage: true }).catch(() => {})
} finally {
  await browser.close()
}

const failed = results.filter((r) => !r.pass)
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(results, null, 2))
console.log('\n--- SUMMARY ---')
console.log(`Passed: ${results.filter((r) => r.pass).length}/${results.length}`)
if (failed.length) {
  console.log('Failed:')
  failed.forEach((f) => console.log(` - ${f.name}: ${f.detail}`))
  process.exit(1)
}
console.log('BROWSER_TEST_OK')
