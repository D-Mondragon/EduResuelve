// Compatibilidad (ISO/IEC 25010): ejecuta la suite E2E completa en Chrome, Edge, Firefox y WebKit (Safari),
// cada uno con una base de datos nueva, y guarda un resumen en test-results/compatibilidad.json.
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const browsers = (process.argv[2] ?? 'chromium,edge,firefox,webkit').split(',')
const results = []
mkdirSync('test-results', { recursive: true })

for (const browser of browsers) {
  const file = `test-results/e2e-${browser}.json`
  const env = { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: file }
  if (browser !== 'chromium') env.E2E_BROWSER = browser
  const started = Date.now()
  const run = spawnSync('npx', ['playwright', 'test', '--reporter=json', ...(browser === 'chromium' ? ['--project=escritorio'] : [])], {
    env, shell: true, encoding: 'utf8', stdio: ['ignore', 'ignore', 'inherit'],
  })
  let stats = { expected: 0, unexpected: 0, flaky: 0, skipped: 0 }
  const failures = []
  try {
    const report = JSON.parse(readFileSync(file, 'utf8'))
    stats = report.stats
    const walk = (suite, path = []) => {
      for (const spec of suite.specs ?? []) {
        for (const t of spec.tests) if (t.status === 'unexpected') failures.push([...path, spec.title].join(' › '))
      }
      for (const child of suite.suites ?? []) walk(child, [...path, child.title])
    }
    for (const s of report.suites) walk(s)
  } catch {
    failures.push('No se pudo leer el informe de Playwright')
  }
  const row = {
    browser, passed: stats.expected, failed: stats.unexpected, flaky: stats.flaky,
    seconds: Math.round((Date.now() - started) / 1000), exitCode: run.status, failures,
  }
  results.push(row)
  console.log(`${browser.padEnd(9)} ✓ ${row.passed}  ✗ ${row.failed}  ~ ${row.flaky}  (${row.seconds} s)`)
  for (const f of failures) console.log(`   ✗ ${f}`)
}

writeFileSync('test-results/compatibilidad.json', JSON.stringify({ date: new Date().toISOString(), results }, null, 2))
process.exit(results.some((r) => r.failed > 0) ? 1 : 0)
