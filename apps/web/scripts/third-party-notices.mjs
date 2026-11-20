/**
 * Genera public/licencias-terceros.txt: avisos de copyright y licencia de las
 * dependencias de producción que se distribuyen en el sitio (lo exigen MIT,
 * BSD, Apache-2.0, ISC, etc.).
 *
 * Uso: npm run licenses   (vuelve a ejecutarlo al agregar o actualizar dependencias)
 */
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

let listing = ''
try {
  listing = execSync('npm ls --omit=dev --all --parseable', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
} catch (e) {
  // npm ls devuelve código ≠ 0 con dependencias "extraneous"; la lista sigue siendo válida.
  listing = e.stdout?.toString() ?? ''
}

const dirs = [...new Set(listing.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && l !== root))]
const seen = new Set()
const entries = []

for (const dir of dirs) {
  const pkgPath = path.join(dir, 'package.json')
  if (!existsSync(pkgPath)) continue
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const id = `${pkg.name}@${pkg.version}`
  if (!pkg.name || seen.has(id)) continue
  seen.add(id)
  const licenseFile = readdirSync(dir).find((f) => /^(licen[sc]e|copying|notice)(\.|$)/i.test(f))
  const license = typeof pkg.license === 'string' ? pkg.license : (pkg.license?.type ?? 'Ver archivo de licencia')
  const repo = typeof pkg.repository === 'string' ? pkg.repository : (pkg.repository?.url ?? pkg.homepage ?? '')
  entries.push({
    id,
    license,
    repo: repo.replace(/^git\+/, '').replace(/\.git$/, ''),
    text: licenseFile ? readFileSync(path.join(dir, licenseFile), 'utf8').trim() : '',
  })
}

entries.sort((a, b) => a.id.localeCompare(b.id))

const header = `COSDI — Avisos de software de terceros
Este sitio incluye los siguientes componentes de código abierto. Cada uno pertenece a sus
respectivos autores y se distribuye bajo la licencia indicada.
Componentes: ${entries.length}
`

const body = entries
  .map((e) => `${'='.repeat(78)}\n${e.id}\nLicencia: ${e.license}${e.repo ? `\n${e.repo}` : ''}\n\n${e.text || '(El paquete no incluye archivo de licencia; ver su repositorio.)'}\n`)
  .join('\n')

const out = path.join(root, 'public', 'licencias-terceros.txt')
writeFileSync(out, `${header}\n${body}`, 'utf8')
console.log(`${entries.length} componentes -> ${path.relative(root, out)}`)
