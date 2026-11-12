import { beforeEach, describe, expect, it } from 'vitest'
import { setupDb, type TestDb } from './helpers'

const sample = (fn: string, ms: number, ok = true, device = 'Escritorio') => ({ fn, ms, ok, device })

describe('Tiempos de respuesta (RNF-001)', () => {
  let t: TestDb
  let admin: string
  let estudiante: string

  beforeEach(async () => {
    t = await setupDb()
    admin = await t.login('greta')
    estudiante = await t.login('alicia')
  })

  it('CP-PERF-01: guarda un lote de mediciones anónimas (solo rol y dispositivo)', async () => {
    const saved = await t.rpc('log_perf', {
      p_token: estudiante,
      p_samples: [sample('list_incidents', 230.6), sample('get_incident', 410, true, 'Móvil')],
    })
    expect(saved).toBe(2)
    const { rows } = await t.db.query<{ fn: string; duration_ms: number; role: string; device: string }>(
      'select fn, duration_ms, role, device from app.perf_samples order by id')
    expect(rows).toEqual([
      { fn: 'list_incidents', duration_ms: 231, role: 'Estudiante', device: 'Escritorio' },
      { fn: 'get_incident', duration_ms: 410, role: 'Estudiante', device: 'Móvil' },
    ])
    const columns = await t.db.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_schema = 'app' and table_name = 'perf_samples'")
    expect(columns.rows.map((c) => c.column_name)).not.toContain('user_id')
  })

  it('CP-PERF-02: ignora mediciones inválidas y exige sesión', async () => {
    const saved = await t.rpc('log_perf', {
      p_token: estudiante,
      p_samples: [
        sample('list_incidents', 100),
        sample('DROP TABLE', 100),
        sample('me', -5),
        sample('me', 999999),
        { fn: 'me', ms: 'rápido', ok: true, device: 'Escritorio' },
        sample('me', 100, true, 'Tablet'),
        'texto',
      ],
    })
    expect(saved).toBe(1)
    await t.expectError(t.rpc('log_perf', { p_token: 'x'.repeat(64), p_samples: [sample('me', 1)] }), 'PT401')
  })

  it('CP-PERF-03: limita el tamaño del lote', async () => {
    const many = Array.from({ length: 51 }, () => sample('me', 10))
    await t.expectError(t.rpc('log_perf', { p_token: estudiante, p_samples: many }), 'P0001', '50')
    await t.expectError(t.rpc('log_perf', { p_token: estudiante, p_samples: { fn: 'me' } }), 'P0001', 'Formato')
  })

  it('CP-PERF-04: conserva solo 90 días', async () => {
    await t.db.query("insert into app.perf_samples (fn, duration_ms, ok, role, device, created_at) values ('me', 5, true, 'Docente', 'Escritorio', now() - interval '91 days')")
    await t.rpc('log_perf', { p_token: estudiante, p_samples: [sample('me', 10)] })
    const { rows } = await t.db.query<{ n: number }>('select count(*)::int n from app.perf_samples')
    expect(rows[0].n).toBe(1)
  })

  it('CP-PERF-05: calcula promedio, mediana, p95 y % bajo 3 s por operación y dispositivo', async () => {
    // 20 mediciones de list_incidents: 100, 200, …, 2000 ms; y 2 de get_incident: una lenta y con error
    const list = Array.from({ length: 20 }, (_, i) => sample('list_incidents', (i + 1) * 100))
    await t.rpc('log_perf', { p_token: estudiante, p_samples: list })
    await t.rpc('log_perf', {
      p_token: estudiante,
      p_samples: [sample('get_incident', 5000, false, 'Móvil'), sample('get_incident', 1000, true, 'Móvil')],
    })

    const stats = await t.rpc('perf_stats', { p_token: admin, p_days: 7 })
    expect(stats.thresholdMs).toBe(3000)
    expect(stats.overall).toMatchObject({ count: 22, maxMs: 5000, underThresholdPct: 95.5, errorPct: 4.5 })
    const list_ = stats.byOperation.find((o: { operation: string }) => o.operation === 'list_incidents')
    expect(list_).toMatchObject({ count: 20, avgMs: 1050, p50Ms: 1050, p95Ms: 1905, maxMs: 2000, underThresholdPct: 100, errorPct: 0 })
    expect(stats.byOperation[0].operation).toBe('get_incident') // ordenado por p95, la más lenta primero
    const movil = stats.byDevice.find((d: { device: string }) => d.device === 'Móvil')
    expect(movil).toMatchObject({ count: 2, underThresholdPct: 50 })
  })

  it('CP-PERF-06: solo Orientación y Administración ven las estadísticas; sin datos responde vacío', async () => {
    await t.expectError(t.rpc('perf_stats', { p_token: estudiante }), 'PT403')
    const docente = await t.login('camila')
    await t.expectError(t.rpc('perf_stats', { p_token: docente }), 'PT403')
    const orientador = await t.login('estela')
    const empty = await t.rpc('perf_stats', { p_token: orientador, p_days: 500 })
    expect(empty).toMatchObject({ days: 90, overall: { count: 0 }, byOperation: [], byDevice: [] })
  })
})
