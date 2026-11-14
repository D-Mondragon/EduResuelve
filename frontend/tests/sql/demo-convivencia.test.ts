import { beforeAll, describe, expect, it } from 'vitest'
import { readSql } from '../../scripts/pglite-db.mjs'
import { setupDb, type TestDb } from './helpers'

describe('Casos de convivencia de demostración (05_demo_convivencia.sql)', () => {
  let t: TestDb
  let codes: string[]
  const detail = async (code: string) => t.rpc('get_incident', { p_token: await t.login('greta'), p_code: code })

  beforeAll(async () => {
    t = await setupDb()
    await t.db.exec(readSql('05_demo_convivencia.sql'))
    const { rows } = await t.db.query<{ entity_id: string }>(
      "select entity_id from app.audit_logs where action = 'Carga de casos de convivencia'",
    )
    codes = rows[0].entity_id.split(', ')
  }, 120_000)

  it('CP-DEMO-05: carga un caso por régimen con su estado esperado', async () => {
    expect(codes).toHaveLength(3)
    const [a, b, c] = await Promise.all(codes.map(detail))
    expect(a).toMatchObject({ status: 'Cerrado', case: { regime: 'Disciplina', severity: 'Leve' } })
    expect(a.case.measures).toHaveLength(1)
    expect(b).toMatchObject({ status: 'En atención', case: { regime: 'Disciplina y violencia', severity: 'Grave', directorAckAt: null } })
    expect(b.allowedActions).toContain('acknowledge')
    expect(c).toMatchObject({ status: 'Resuelto', case: { regime: 'Violencia', siseveCode: 'SV-2026-004377' } })
    expect(c.case.referrals[0].entity).toBe('DEMUNA')
    // El acta definitiva del caso A guarda el caso completo
    const acta = await t.rpc('get_acta', { p_token: await t.login('greta'), p_number: a.actas[0].number })
    expect(acta).toMatchObject({ kind: 'Definitiva', content: { case: { regime: 'Disciplina' } } })
    expect(acta.content.case.meetings[0].signatureStatus).toBe('Firmada')
  })

  it('CP-DEMO-06: es idempotente y no deja sesiones temporales', async () => {
    const before = await t.db.query<{ n: number }>('select count(*)::int n from app.incidents')
    await t.db.exec(readSql('05_demo_convivencia.sql'))
    const after = await t.db.query<{ n: number }>('select count(*)::int n from app.incidents')
    expect(after.rows[0].n).toBe(before.rows[0].n)
    const sessions = await t.db.query<{ n: number }>('select count(*)::int n from app.sessions where expires_at < now() + interval \'11 minutes\'')
    expect(sessions.rows[0].n).toBe(0)
  })
})
