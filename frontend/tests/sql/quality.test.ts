import { beforeEach, describe, expect, it } from 'vitest'
import { setupDb, validIncident, type TestDb } from './helpers'

type Check = { check: string; affected: number; total: number; okPct: number; codes: string[]; severity: string }
type Priority = {
  priority: string
  targetHours: number
  resolved: number
  open: number
  overdueOpen: number
  overdueCodes: string[]
  withinTargetPct: number | null
  avgHoursToResolve: number | null
  medianHoursToResolve: number | null
  avgHoursToClose: number | null
}

describe('Panel de calidad (tiempos de resolución, calidad de datos, satisfacción)', () => {
  let t: TestDb
  let admin: string

  beforeEach(async () => {
    t = await setupDb()
    admin = await t.login('greta')
  })

  const stats = () => t.rpc('quality_stats', { p_token: admin })
  const check = (q: { dataQuality: { checks: Check[] } }, text: string) =>
    q.dataQuality.checks.find((c) => c.check.includes(text))!
  const priority = (q: { resolution: { byPriority: Priority[] } }, name: string) =>
    q.resolution.byPriority.find((p) => p.priority === name)!

  it('CP-CAL-01: tiempos por prioridad con metas, promedio, mediana y casos vencidos', async () => {
    const q = await stats()
    expect(q.totals).toEqual({ incidents: 5, open: 3, resolved: 1, closed: 1, discarded: 0 })
    expect(q.resolution.byPriority.map((p: Priority) => [p.priority, p.targetHours])).toEqual([
      ['Crítica', 24], ['Alta', 72], ['Media', 168], ['Baja', 360],
    ])
    // ER-2026-0004 (Baja): resuelta en 73,2 h, cerrada en 92,5 h → dentro de la meta de 360 h
    expect(priority(q, 'Baja')).toMatchObject({
      resolved: 1, withinTargetPct: 100, avgHoursToResolve: 73.2, medianHoursToResolve: 73.2, avgHoursToClose: 92.5,
    })
    // ER-2026-0003 (Crítica) sigue abierta desde septiembre → vencida
    expect(priority(q, 'Crítica')).toMatchObject({ resolved: 0, withinTargetPct: null, open: 1, overdueOpen: 1, overdueCodes: ['ER-2026-0003'] })
  })

  it('CP-CAL-02: una resolución fuera de meta baja el porcentaje de cumplimiento', async () => {
    // ER-2026-0003 (Crítica, meta 24 h) se resuelve semanas después de registrarse
    await t.rpc('resolve_incident', {
      p_token: admin, p_code: 'ER-2026-0003',
      p_data: { summary: 'S', actionsTaken: 'A', result: 'R', observations: '', resolutionDate: '2026-10-01' },
    })
    const q = await stats()
    expect(priority(q, 'Crítica')).toMatchObject({ resolved: 1, withinTargetPct: 0, overdueOpen: 0 })
    expect(q.resolution.withinTargetPct).toBeCloseTo(66.7, 1) // 2 de 3 resueltas dentro de la meta
  })

  it('CP-CAL-03: los datos demo pasan los controles de integridad y consistencia', async () => {
    const q = await stats()
    for (const c of q.dataQuality.checks.filter((x: Check) => x.severity === 'error')) {
      expect(c.affected, c.check).toBe(0)
    }
    expect(check(q, 'sin movimiento')).toMatchObject({ affected: 3, total: 3, okPct: 0 })
    expect(q.dataQuality.score).toBe(87.5)
  })

  it('CP-CAL-04: detecta datos incompletos e inconsistentes', async () => {
    // Datos dañados a propósito (como si vinieran de una carga externa o un error)
    await t.db.query(`insert into app.incidents (code, title, description, category, priority, status, incident_date, location, reported_by, registered_at)
      values ('ER-2026-0900', 'Caso dañado', 'Descripción', 'Académica', 'Media', 'Resuelto', '2026-10-20', 'Aula', '00000000-0000-4000-a000-000000000001', '2026-10-10T15:00:00Z'),
             ('ER-2026-0901', 'Caso sin responsable', 'Descripción', 'Académica', 'Media', 'Asignado', '2026-10-01', 'Aula', '00000000-0000-4000-a000-000000000001', now())`)
    const q = await stats()
    expect(check(q, 'sin resolución registrada').codes).toEqual(['ER-2026-0900'])
    expect(check(q, 'sin acta vigente').codes).toEqual(['ER-2026-0900'])
    expect(check(q, 'posterior a la fecha de registro').codes).toEqual(['ER-2026-0900'])
    expect(check(q, 'sin responsable').codes).toEqual(['ER-2026-0901'])
    expect(check(q, 'Sin personas involucradas').codes).toEqual(['ER-2026-0900', 'ER-2026-0901'])
    expect(q.dataQuality.score).toBeLessThan(87.5)
  })

  it('CP-CAL-05: detecta posibles duplicados (mismo título y categoría en 7 días)', async () => {
    const alicia = await t.login('alicia')
    const a = await t.rpc('create_incident', { p_token: alicia, p_data: validIncident })
    const b = await t.rpc('create_incident', { p_token: alicia, p_data: { ...validIncident, title: '  PRUEBA de registro ' } })
    await t.rpc('create_incident', { p_token: alicia, p_data: { ...validIncident, category: 'Académica' } })
    const q = await stats()
    expect(check(q, 'duplicados').codes).toEqual([a.code, b.code])
  })

  it('CP-CAL-06: satisfacción: tasa de respuesta, CSAT, distribución y alertas', async () => {
    let q = await stats()
    expect(q.satisfaction).toMatchObject({ responses: 0, pending: 1, csatPct: null, avgRating: null })

    const bruno = await t.login('bruno')
    await t.rpc('submit_survey', { p_token: bruno, p_code: 'ER-2026-0004', p_data: { rating: 2, resolved: 'No', speedRating: 3, comment: '' } })
    q = await stats()
    expect(q.satisfaction).toMatchObject({
      responses: 1, pending: 0, avgRating: 2, csatPct: 0, avgSpeed: 3, lowCount: 1,
      resolved: { Sí: 0, Parcialmente: 0, No: 1 },
    })
    expect(q.satisfaction.ratingDistribution[1]).toEqual({ rating: 2, count: 1 })
  })

  it('CP-CAL-07: solo Orientación y Administración acceden al panel', async () => {
    for (const who of ['alicia', 'camila'] as const) {
      await t.expectError(t.rpc('quality_stats', { p_token: await t.login(who) }), 'PT403')
    }
    await expect(t.rpc('quality_stats', { p_token: await t.login('estela') })).resolves.toBeTruthy()
  })
})
