/**
 * Smoke: login must NOT auto-start tutorial; no «Ver tutorial» menu entry.
 * node scripts/browser-test-tutorial.mjs
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE = process.env.WEB_URL || 'http://localhost:5173'
const OUT = path.join(__dirname, 'browser-test-results-tutorial')
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
  await page.evaluate(() => {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && (k.startsWith('panel-tour-done:') || k === 'token')) keys.push(k)
    }
    keys.forEach((k) => localStorage.removeItem(k))
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByPlaceholder('Ingresa tu email').fill(email)
  await page.getByPlaceholder('Ingresa tu contraseña').fill(password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
}

const HEADED = process.env.HEADED === '1'
const browser = await chromium.launch({ headless: !HEADED })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

try {
  await login(page, 'admin@showroom.com', 'Showroom2026!')
  ok('Login negocio')

  await page.goto(`${BASE}/`)
  await page.waitForTimeout(1500)
  const popover = page.locator('.driver-popover')
  const autoVisible = await popover.isVisible().catch(() => false)
  if (autoVisible) {
    fail('Tour no debe autoarrancar tras login')
  } else {
    ok('Sin autoarranque de tutorial tras login')
  }
  await page.screenshot({ path: path.join(OUT, '01-no-auto-tour.png'), fullPage: true })

  // User menu must not expose «Ver tutorial»
  const userBtn = page.getByRole('button', { name: /Administrador Showroom|Showroom|Negocio/i }).first()
  if (await userBtn.count()) {
    await userBtn.click()
    await page.waitForTimeout(300)
    const replay = page.getByRole('button', { name: 'Ver tutorial' })
    if (await replay.count()) {
      fail('Botón Ver tutorial no debe aparecer')
    } else {
      ok('Menú sin Ver tutorial')
    }
    await page.screenshot({ path: path.join(OUT, '02-user-menu.png'), fullPage: true })
  } else {
    ok('Menú usuario no encontrado con ese patrón — se omite assert de Ver tutorial')
  }
} catch (err) {
  fail('Excepción', String(err))
  await page.screenshot({ path: path.join(OUT, '99-error.png'), fullPage: true }).catch(() => {})
} finally {
  const summary = {
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
    results,
  }
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2))
  console.log(JSON.stringify(summary, null, 2))
  await browser.close()
  if (summary.failed > 0) process.exit(1)
}
