// Mide la versión publicada con Lighthouse (rendimiento, accesibilidad, buenas prácticas y SEO),
// en escritorio y en móvil, incluidas pantallas que requieren sesión.
// Uso: node scripts/lighthouse.mjs [url-base]   (por defecto https://eduresuelve.vercel.app)
// Guarda los informes HTML y un resumen en ../docs/calidad/evidencias/lighthouse/.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'
import { chromium } from 'playwright'

const BASE = (process.argv[2] ?? 'https://eduresuelve.vercel.app').replace(/\/$/, '')
const OUT = `../docs/calidad/evidencias/lighthouse/${process.env.LH_LABEL ?? 'actual'}`
const PORT = 9333
const DNI = process.env.LH_DNI ?? '70000007' // Administrador demo
const PASSWORD = process.env.LH_PASSWORD ?? 'EduResuelve2026'

const pages = [
  { name: 'login', path: '/login', auth: false },
  { name: 'verificar', path: '/verificar', auth: false },
  { name: 'inicio', path: '/dashboard', auth: true },
  { name: 'incidencias', path: '/incidencias', auth: true },
  { name: 'detalle', path: '/incidencias/ER-2026-0004', auth: true },
  { name: 'calidad', path: '/calidad', auth: true },
]
const categories = ['performance', 'accessibility', 'best-practices', 'seo']

mkdirSync(OUT, { recursive: true })
const profile = join(tmpdir(), `lh-eduresuelve-${Date.now()}`)
const context = await chromium.launchPersistentContext(profile, {
  channel: 'chromium',
  headless: true,
  args: [`--remote-debugging-port=${PORT}`],
})

const rows = []
async function measure(formFactor, p) {
  const flags = {
    port: PORT,
    output: ['html', 'json'],
    logLevel: 'error',
    onlyCategories: categories,
    // No borrar el almacenamiento: conserva la sesión en las pantallas protegidas
    disableStorageReset: true,
  }
  const config = formFactor === 'desktop' ? desktopConfig : undefined
  const result = await lighthouse(`${BASE}${p.path}`, flags, config)
  const lhr = result.lhr
  const [html] = result.report
  writeFileSync(`${OUT}/${formFactor}-${p.name}.html`, html)
  const audit = (id) => lhr.audits[id]?.numericValue
  const row = {
    formFactor,
    page: p.name,
    path: p.path,
    finalUrl: lhr.finalDisplayedUrl,
    ...Object.fromEntries(categories.map((c) => [c, Math.round((lhr.categories[c]?.score ?? 0) * 100)])),
    fcpMs: Math.round(audit('first-contentful-paint')),
    lcpMs: Math.round(audit('largest-contentful-paint')),
    tbtMs: Math.round(audit('total-blocking-time')),
    cls: Number((audit('cumulative-layout-shift') ?? 0).toFixed(3)),
    siMs: Math.round(audit('speed-index')),
    transferKb: Math.round((audit('total-byte-weight') ?? 0) / 1024),
    failedAudits: Object.values(lhr.audits)
      .filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'manual')
      .map((a) => `${a.id} (${Math.round(a.score * 100)})`)
      .slice(0, 12),
  }
  rows.push(row)
  console.log(
    `${formFactor.padEnd(7)} ${p.name.padEnd(12)} rend ${String(row.performance).padStart(3)} · acc ${row.accessibility} · bp ${row['best-practices']} · seo ${row.seo} · LCP ${row.lcpMs} ms · CLS ${row.cls} · TBT ${row.tbtMs} ms`,
  )
}

// 1) Páginas públicas, sin sesión
for (const formFactor of ['desktop', 'mobile']) {
  for (const p of pages.filter((x) => !x.auth)) await measure(formFactor, p)
}

// 2) Inicia sesión una vez: el token queda en el almacenamiento del perfil y Lighthouse lo reutiliza
const page = context.pages()[0] ?? (await context.newPage())
await page.goto(`${BASE}/login`)
await page.getByLabel('DNI').fill(DNI)
await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
await page.getByRole('button', { name: 'Ingresar' }).click()
await page.waitForURL(/dashboard/, { timeout: 30_000 })

for (const formFactor of ['desktop', 'mobile']) {
  for (const p of pages.filter((x) => x.auth)) await measure(formFactor, p)
}

writeFileSync(`${OUT}/resumen.json`, JSON.stringify({ date: new Date().toISOString(), base: BASE, lighthouse: (await import('lighthouse/package.json', { with: { type: 'json' } })).default.version, rows }, null, 2))
await context.close()
rmSync(profile, { recursive: true, force: true })
