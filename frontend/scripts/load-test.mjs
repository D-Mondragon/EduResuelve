// Prueba de carga ligera y de SOLO LECTURA contra la API de Supabase (eficiencia y capacidad, ISO/IEC 25010).
// N usuarios virtuales consultan durante D segundos: listar incidencias, ver una incidencia y notificaciones.
// Uso: node scripts/load-test.mjs [usuarios=10] [segundos=30]
// Lee VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY de .env.local. Guarda ../docs/calidad/evidencias/carga.json.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => /^VITE_SUPABASE_(URL|ANON_KEY)=/.test(l)).map((l) => l.split(/=(.*)/s).slice(0, 2)),
)
const URL = env.VITE_SUPABASE_URL.replace(/\/$/, '')
const KEY = env.VITE_SUPABASE_ANON_KEY
const USERS = Number(process.argv[2] ?? 10)
const SECONDS = Number(process.argv[3] ?? 30)
const THRESHOLD = 3000

async function rpc(fn, args) {
  const started = performance.now()
  try {
    const res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    })
    const body = await res.json().catch(() => null)
    return { ms: performance.now() - started, ok: res.ok, status: res.status, body }
  } catch {
    return { ms: performance.now() - started, ok: false, status: 0, body: null }
  }
}

// Una sesión por rol (las sesiones se cierran al final)
const accounts = ['70000007', '70000005', '70000003', '70000001']
const tokens = []
for (const dni of accounts) {
  const r = await rpc('login', { p_dni: dni, p_password: 'EduResuelve2026' })
  if (!r.body?.token) throw new Error(`No se pudo iniciar sesión con ${dni}`)
  tokens.push(r.body.token)
}
const codes = (await rpc('list_incidents', { p_token: tokens[0] })).body.map((i) => i.code)

const samples = []
const deadline = Date.now() + SECONDS * 1000
async function virtualUser(i) {
  const token = tokens[i % tokens.length]
  while (Date.now() < deadline) {
    const dice = Math.random()
    const [fn, args] =
      dice < 0.4 ? ['list_incidents', { p_token: token }]
        : dice < 0.8 ? ['get_incident', { p_token: tokens[0], p_code: codes[Math.floor(Math.random() * codes.length)] }]
          : ['list_notifications', { p_token: token }]
    const r = await rpc(fn, args)
    samples.push({ fn, ms: r.ms, ok: r.ok, status: r.status })
    await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 600)) // "tiempo de lectura"
  }
}
const started = Date.now()
await Promise.all(Array.from({ length: USERS }, (_, i) => virtualUser(i)))
const elapsed = (Date.now() - started) / 1000
for (const t of tokens) await rpc('logout', { p_token: t })

const pct = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b)
  return Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] ?? 0)
}
const summarize = (list) => {
  const ms = list.map((s) => s.ms)
  return {
    requests: list.length,
    errors: list.filter((s) => !s.ok).length,
    avgMs: Math.round(ms.reduce((a, b) => a + b, 0) / (ms.length || 1)),
    p50Ms: pct(ms, 50), p95Ms: pct(ms, 95), p99Ms: pct(ms, 99), maxMs: Math.round(Math.max(...ms)),
    underThresholdPct: Math.round((1000 * ms.filter((m) => m <= THRESHOLD).length) / (ms.length || 1)) / 10,
  }
}
const result = {
  date: new Date().toISOString(),
  target: 'Supabase Data API (RPC de solo lectura)',
  virtualUsers: USERS,
  seconds: Math.round(elapsed),
  throughputRps: Math.round((samples.length / elapsed) * 10) / 10,
  overall: summarize(samples),
  byOperation: Object.fromEntries(['list_incidents', 'get_incident', 'list_notifications'].map((fn) => [fn, summarize(samples.filter((s) => s.fn === fn))])),
  statusCodes: samples.reduce((acc, s) => ({ ...acc, [s.status]: (acc[s.status] ?? 0) + 1 }), {}),
}
mkdirSync('../docs/calidad/evidencias', { recursive: true })
writeFileSync(`../docs/calidad/evidencias/carga-${USERS}u.json`, JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
