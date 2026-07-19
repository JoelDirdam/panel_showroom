/**
 * Smoke: admin tutorial auto-start + replay.
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
  ok('Login admin')

  await page.goto(`${BASE}/`)
  const popover = page.locator('.driver-popover')
  await popover.waitFor({ state: 'visible', timeout: 12000 })
  const title = (await popover.locator('.driver-popover-title').textContent())?.trim() || ''
  ok('Tour autoarranque visible', title)
  await page.screenshot({ path: path.join(OUT, '01-admin-tour-sidebar.png'), fullPage: true })

  await popover.locator('.driver-popover-next-btn').click({ force: true })
  await page.waitForTimeout(500)
  ok('Tour avanza con Siguiente')
  await page.screenshot({ path: path.join(OUT, '02-admin-tour-next.png'), fullPage: true })

  // Close via X
  const close = page.locator('.driver-popover-close-btn')
  if (await close.count()) {
    await close.click({ force: true })
  } else {
    await page.keyboard.press('Escape')
  }
  await page.waitForTimeout(400)
  if (await popover.isVisible().catch(() => false)) {
    fail('Tour no se cerró')
  } else {
    ok('Tour cerrado')
  }

  // Replay
  await page.getByRole('button', { name: /Administrador Showroom/i }).click()
  await page.getByRole('button', { name: 'Ver tutorial' }).click()
  await popover.waitFor({ state: 'visible', timeout: 10000 })
  ok('Replay desde Ver tutorial')
  await page.screenshot({ path: path.join(OUT, '03-admin-tour-replay.png'), fullPage: true })

  // Brand tour — close current and switch user
  await page.locator('.driver-popover-close-btn').click({ force: true }).catch(() => {})
  await page.evaluate(() => {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && (k.startsWith('panel-tour-done:') || k === 'token')) keys.push(k)
    }
    keys.forEach((k) => localStorage.removeItem(k))
  })
  await page.goto(`${BASE}/login`)
  await page.getByPlaceholder('Ingresa tu email').fill('marca@bubbles.com')
  await page.getByPlaceholder('Ingresa tu contraseña').fill('Showroom2026!')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })

  // may land on change-password
  if (page.url().includes('change-password')) {
    ok('Marca requiere cambio de contraseña — se omite tour de marca en este smoke')
  } else {
    await page.goto(`${BASE}/`)
    await popover.waitFor({ state: 'visible', timeout: 12000 })
    const brandTitle = (await popover.locator('.driver-popover-title').textContent())?.trim() || ''
    ok('Tour marca autoarranque', brandTitle)
    await page.screenshot({ path: path.join(OUT, '04-brand-tour.png'), fullPage: true })
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
