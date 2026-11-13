import { beforeEach, describe, expect, it } from 'vitest'
import { setupDb, type TestDb } from './helpers'

type Row = {
  code: string
  status: string
  priority: string
  targetHours: number
  hoursToResolve: number | null
  hoursToClose: number | null
  ageHours: number
  acta: { number: string; kind: string } | null
  surveyRating: number | null
  responsible: { fullName: string } | null
  reporter: { fullName: string } | null
}

describe('Reportes (report_incidents)', () => {
  let t: TestDb
  let admin: string

  beforeEach(async () => {
    t = await setupDb()
    admin = await t.login('greta')
  })

  const report = (args: Record<string, unknown> = {}) => t.rpc('report_incidents', { p_token: admin, ...args }) as Promise<Row[]>

  it('CP-REP-01: devuelve una fila por incidencia, ordenada de la más reciente a la más antigua', async () => {
    const rows = await report()
    expect(rows.map((r) => r.code)).toEqual(['ER-2026-0001', 'ER-2026-0002', 'ER-2026-0003', 'ER-2026-0004', 'ER-2026-0005'])
  })

  it('CP-REP-02: incluye tiempos frente a la meta, acta vigente y satisfacción', async () => {
    const bruno = await t.login('bruno')
    await t.rpc('submit_survey', { p_token: bruno, p_code: 'ER-2026-0004', p_data: { rating: 4, resolved: 'Sí', speedRating: 4, comment: '' } })
    const rows = await report()
    const closed = rows.find((r) => r.code === 'ER-2026-0004')!
    expect(closed).toMatchObject({
      status: 'Cerrado', priority: 'Baja', targetHours: 360, hoursToResolve: 73.2, hoursToClose: 92.5,
      acta: { number: 'ACT-2026-0004-02', kind: 'Definitiva' }, surveyRating: 4,
      reporter: { fullName: 'Bruno Muestra' }, responsible: { fullName: 'Fabián Imaginario' },
    })
    const resolved = rows.find((r) => r.code === 'ER-2026-0005')!
    expect(resolved.acta).toEqual({ number: 'ACT-2026-0005-01', kind: 'Provisional' })
    const open = rows.find((r) => r.code === 'ER-2026-0003')!
    expect(open).toMatchObject({ hoursToResolve: null, acta: null, surveyRating: null })
    expect(open.ageHours).toBeGreaterThan(open.targetHours) // registrada en septiembre: vencida
  })

  it('CP-REP-03: filtra por periodo de registro (fecha de Lima) y valida el rango', async () => {
    const rows = await report({ p_from: '2026-09-18', p_to: '2026-09-20' })
    expect(rows.map((r) => r.code).sort()).toEqual(['ER-2026-0003', 'ER-2026-0004'])
    expect(await report({ p_from: '2030-01-01' })).toEqual([])
    await t.expectError(report({ p_from: '2026-10-01', p_to: '2026-09-01' }), 'P0001', 'posterior')
  })

  it('CP-REP-04: solo Orientación y Administración acceden, y cada consulta queda auditada', async () => {
    for (const who of ['alicia', 'camila'] as const) {
      await t.expectError(t.rpc('report_incidents', { p_token: await t.login(who) }), 'PT403')
    }
    const estela = await t.login('estela')
    await expect(t.rpc('report_incidents', { p_token: estela })).resolves.toHaveLength(5)
    const audit = await t.rpc('list_audit', { p_token: admin })
    expect(audit[0]).toMatchObject({ action: 'Consulta de reporte', module: 'Reportes' })
  })
})
