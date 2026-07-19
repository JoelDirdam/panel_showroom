import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE = 'http://localhost:5173'
const OUT = path.join(__dirname, 'browser-test-results-agenda')
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

const HEADED = process.env.HEADED === '1' || process.argv.includes('--headed')
const SLOWMO = Number(process.env.SLOWMO ?? (HEADED ? 400 : 0))
const browser = await chromium.launch({ headless: !HEADED, slowMo: SLOWMO })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

page.on('dialog', async (dialog) => {
  if (dialog.type() === 'prompt') await dialog.accept('Nota Playwright local')
  else await dialog.accept()
})

try {
  await login(page, 'admin@showroom.com', 'Showroom2026!')
  ok('Login admin')

  await page.goto(`${BASE}/agenda`)
  await page.waitForSelector('text=Disponibilidad: Llevar stock', { timeout: 15000 })
  await page.screenshot({ path: path.join(OUT, '01-admin-weekly-config.png'), fullPage: true })
  ok('Página Agenda muestra configuración semanal')

  const ruleSection = page.locator('text=Disponibilidad: Llevar stock').locator('xpath=ancestor::div[contains(@class,"rounded-2xl")]').first()

  // Checkbox lives in the card header; body only renders when enabled
  const headerCheckbox = ruleSection.locator('input[type="checkbox"]').first()
  if (!(await headerCheckbox.isChecked())) {
    await headerCheckbox.check()
    await page.waitForTimeout(500)
  }
  await ruleSection.locator('text=Días de la semana').waitFor({ timeout: 8000 })
  ok('Checkbox en header muestra el cuerpo de la card')
  for (const day of ['Lun', 'Mié', 'Sáb']) {
    const btn = ruleSection.getByRole('button', { name: day, exact: true }).first()
    const cls = await btn.getAttribute('class')
    if (!cls?.includes('bg-brand-500')) await btn.click()
  }

  await ruleSection.locator('input[type="time"]').nth(0).fill('12:00')
  await ruleSection.locator('input[type="time"]').nth(1).fill('14:00')
  await ruleSection.getByRole('button', { name: 'Cada 30 min' }).click()
  await page.screenshot({ path: path.join(OUT, '02-admin-rule-filled.png'), fullPage: true })

  await ruleSection.getByRole('button', { name: 'Guardar horario semanal' }).click()
  await page.waitForSelector('text=Horario semanal guardado', { timeout: 15000 })
  ok('Admin guarda regla semanal')

  await page.waitForTimeout(800)
  const badge = page.getByText(/\d+ disp\./).first()
  await badge.waitFor({ timeout: 10000 })
  ok('Calendario muestra disponibles', await badge.innerText())
  await page.screenshot({ path: path.join(OUT, '03-admin-calendar-badges.png'), fullPage: true })

  // Brand books
  await page.evaluate(() => localStorage.clear())
  await login(page, 'marca@bubbles.com', 'Showroom2026!')
  ok('Login marca')

  await page.goto(`${BASE}/agenda`)
  await page.waitForSelector('text=Calendario', { timeout: 15000 })
  await page.screenshot({ path: path.join(OUT, '04-brand-calendar.png'), fullPage: true })

  const brandDay = page.locator('div.grid.grid-cols-7.gap-1 > button:not([disabled])').filter({
    has: page.getByText(/disp\./),
  })
  // May need next month
  for (let attempt = 0; attempt < 3 && (await brandDay.count()) === 0; attempt++) {
    await page.getByRole('button', { name: 'Mes siguiente' }).click()
    await page.waitForTimeout(600)
  }
  if ((await brandDay.count()) === 0) fail('Marca ve día con disponibles')
  else {
    ok('Marca ve día con disponibles', (await brandDay.first().innerText()).replace(/\s+/g, ' ').trim())
    await brandDay.first().click()
  }

  await page.waitForSelector('text=Elige una hora disponible', { timeout: 8000 })
  await page.screenshot({ path: path.join(OUT, '05-brand-day-slots.png'), fullPage: true })

  const timeSlots = page.getByRole('button').filter({ hasText: /\d{1,2}:\d{2}.+\d{1,2}:\d{2}/ })
  const timeCount = await timeSlots.count()
  if (timeCount === 0) fail('Rectángulos de horas disponibles', 'ninguno')
  else {
    ok('Rectángulos de horas disponibles', `${timeCount} botones`)
    await timeSlots.first().click()
  }

  await page.waitForSelector('text=Cita reservada', { timeout: 10000 })
  ok('Marca reserva cita')
  await page.screenshot({ path: path.join(OUT, '06-brand-booked.png'), fullPage: true })

  const apptRow = page.locator('table tbody tr').filter({ hasText: 'Llevar stock' })
  if ((await apptRow.count()) > 0) ok('Cita aparece en Mis citas')
  else fail('Cita aparece en Mis citas')

  // Admin changes rule — booking should remain
  await page.evaluate(() => localStorage.clear())
  await login(page, 'admin@showroom.com', 'Showroom2026!')
  await page.goto(`${BASE}/agenda`)
  await page.waitForSelector('text=Disponibilidad: Llevar stock', { timeout: 15000 })

  const ruleSection2 = page.locator('text=Disponibilidad: Llevar stock').locator('xpath=ancestor::div[contains(@class,"rounded-2xl")]').first()
  // Clear days then select only Vie
  for (const day of ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']) {
    const btn = ruleSection2.getByRole('button', { name: day, exact: true }).first()
    const cls = await btn.getAttribute('class')
    if (cls?.includes('bg-brand-500') && day !== 'Vie') await btn.click()
    if (!cls?.includes('bg-brand-500') && day === 'Vie') await btn.click()
  }
  await ruleSection2.locator('input[type="time"]').nth(0).fill('10:00')
  await ruleSection2.locator('input[type="time"]').nth(1).fill('11:00')
  await ruleSection2.getByRole('button', { name: 'Guardar horario semanal' }).click()
  await page.waitForSelector('text=Horario semanal guardado', { timeout: 15000 })
  ok('Admin modifica regla semanal')

  const reservedBadge = page.getByText(/\d+ reserv\./).first()
  // Navigate months looking for reserved
  let foundReserved = await reservedBadge.isVisible().catch(() => false)
  for (let i = 0; i < 3 && !foundReserved; i++) {
    await page.getByRole('button', { name: 'Mes siguiente' }).click()
    await page.waitForTimeout(700)
    foundReserved = await reservedBadge.isVisible().catch(() => false)
  }
  // Also go back
  if (!foundReserved) {
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: 'Mes anterior' }).click()
      await page.waitForTimeout(700)
      foundReserved = await reservedBadge.isVisible().catch(() => false)
      if (foundReserved) break
    }
  }
  if (foundReserved) {
    ok('Admin ve reserva conservada tras cambiar regla', await reservedBadge.innerText())
    const dayWithReserved = page.locator('div.grid.grid-cols-7.gap-1 > button:not([disabled])').filter({
      has: page.getByText(/reserv\./),
    })
    if ((await dayWithReserved.count()) > 0) {
      await dayWithReserved.first().click()
      await page.waitForSelector('text=Reservado por', { timeout: 8000 })
      ok('Admin ve horario reservado en modal')
      await page.screenshot({ path: path.join(OUT, '07-admin-preserved-booking.png'), fullPage: true })
    } else {
      fail('Admin ve horario reservado en modal', 'sin día clickable')
    }
  } else {
    fail('Admin ve reserva conservada tras cambiar regla', 'badge no visible')
  }
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
