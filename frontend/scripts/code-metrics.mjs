// Métricas de mantenibilidad (ISO/IEC 25010): tamaño del código, proporción de pruebas y complejidad
// ciclomática (regla "complexity" de ESLint). Guarda ../docs/calidad/evidencias/codigo.json.
import { spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

function files(dir, exts) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...files(p, exts))
    else if (exts.some((e) => name.endsWith(e))) out.push(p)
  }
  return out
}
function loc(list) {
  let code = 0
  for (const f of list) {
    for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
      const t = line.trim()
      if (t && !t.startsWith('//') && !t.startsWith('--') && !t.startsWith('*') && !t.startsWith('/*')) code++
    }
  }
  return { files: list.length, loc: code }
}

const app = files('src', ['.ts', '.tsx']).filter((f) => !/\.test\.tsx?$/.test(f) && !f.includes(`${join('src', 'test')}`))
const unitTests = files('src', ['.test.ts', '.test.tsx'])
const sqlTests = files('tests/sql', ['.ts'])
const e2eTests = files('tests/e2e', ['.ts'])
const sql = files('../supabase', ['.sql'])

// Complejidad ciclomática por función (umbral 10, valor usual)
const THRESHOLD = 10
const lint = spawnSync('npx', ['eslint', 'src', '--rule', `{"complexity":["warn",${THRESHOLD}]}`, '-f', 'json'], { shell: true, encoding: 'utf8', maxBuffer: 50e6 })
const report = JSON.parse(lint.stdout || '[]')
const complex = []
for (const file of report) {
  for (const m of file.messages) {
    if (m.ruleId === 'complexity') {
      const value = Number(m.message.match(/complexity of (\d+)/)?.[1] ?? 0)
      complex.push({ file: file.filePath.split(/[\\/]src[\\/]/)[1], line: m.line, complexity: value, message: m.message })
    }
  }
}
complex.sort((a, b) => b.complexity - a.complexity)
const lintProblems = report.reduce((n, f) => n + f.messages.filter((m) => m.ruleId !== 'complexity').length, 0)

const result = {
  date: new Date().toISOString(),
  frontend: loc(app),
  sql: loc(sql),
  tests: { unit: loc(unitTests), sql: loc(sqlTests), e2e: loc(e2eTests) },
  testToCodeRatio: Math.round(((loc(unitTests).loc + loc(sqlTests).loc + loc(e2eTests).loc) / (loc(app).loc + loc(sql).loc)) * 100) / 100,
  complexity: { threshold: THRESHOLD, functionsAbove: complex.length, max: complex[0]?.complexity ?? 0, top: complex.slice(0, 10) },
  lintProblems,
}
mkdirSync('../docs/calidad/evidencias', { recursive: true })
writeFileSync('../docs/calidad/evidencias/codigo.json', JSON.stringify(result, null, 2))
console.log(JSON.stringify({ ...result, complexity: { ...result.complexity, top: result.complexity.top.map((c) => `${c.file}:${c.line} → ${c.complexity}`) } }, null, 2))
