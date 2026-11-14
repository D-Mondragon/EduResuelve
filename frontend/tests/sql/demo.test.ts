import { beforeAll, describe, expect, it } from 'vitest'
import { readSql } from '../../scripts/pglite-db.mjs'
import { setupDb, type TestDb } from './helpers'

describe('Datos de demostración ampliados (04_demo_ampliado.sql)', () => {
  let t: TestDb
  let admin: string
  const one = async <T,>(sql: string) => (await t.db.query<T>(sql)).rows[0]

  beforeAll(async () => {
    t = await setupDb()
    // Simula datos existentes del usuario antes de la carga
    const alicia = await t.login('alicia')
    await t.rpc('create_incident', {
      p_token: alicia,
      p_data: { title: 'Caso real previo', description: 'Registrado antes de la carga.', category: 'Académica',
                priority: 'Media', incidentDate: '2026-10-01', location: 'Aula 1', involvedPeople: '' },
    })
    await t.db.exec(readSql('04_demo_ampliado.sql'))
    admin = await t.login('greta')
  }, 120_000)

  it('CP-DEMO-01: agrega 40 incidencias con códigos que continúan el contador, sin tocar las existentes', async () => {
    const r = await one<{ total: number; previa: string; ultima: string; contador: number }>(`
      select (select count(*)::int from app.incidents) total,
             (select title from app.incidents where code = 'ER-2026-0006') previa,
             (select max(code) from app.incidents) ultima,
             (select last from app.incident_counters where year = 2026) contador`)
    expect(r).toEqual({ total: 46, previa: 'Caso real previo', ultima: 'ER-2026-0046', contador: 46 })
    const audit = await one<{ entity_id: string }>("select entity_id from app.audit_logs where action = 'Carga de datos de demostración'")
    expect(audit.entity_id).toBe('ER-2026-0007 … ER-2026-0046')
  })

  it('CP-DEMO-02: es idempotente (una segunda ejecución no duplica nada)', async () => {
    const before = await one<{ n: number }>('select count(*)::int n from app.incidents')
    await t.db.exec(readSql('04_demo_ampliado.sql'))
    expect(await one('select count(*)::int n from app.incidents')).toEqual(before)
  })

  it('CP-DEMO-03: los datos son coherentes: sin fechas futuras ni historial desordenado', async () => {
    const r = await one(`select
      (select count(*)::int from app.follow_ups where created_at > now()) futuros,
      (select count(*)::int from app.surveys where created_at > now()) encuestas_futuras,
      (select count(*)::int from app.resolutions r join app.incidents i on i.code = r.incident_code
         where r.resolution_date < i.incident_date) resoluciones_antes_del_hecho,
      (select count(*)::int from app.follow_ups f join app.follow_ups g
         on g.incident_code = f.incident_code and g.id > f.id and g.created_at < f.created_at) desordenados,
      (select count(*)::int from app.incidents i where i.updated_at <> (select max(created_at) from app.follow_ups f where f.incident_code = i.code)
         and i.code >= 'ER-2026-0007') updated_at_incorrecto`)
    expect(r).toEqual({ futuros: 0, encuestas_futuras: 0, resoluciones_antes_del_hecho: 0, desordenados: 0, updated_at_incorrecto: 0 })
  })

  it('CP-DEMO-04: pasa los controles de integridad del panel y cada resuelta/cerrada tiene su acta', async () => {
    const q = await t.rpc('quality_stats', { p_token: admin })
    for (const c of q.dataQuality.checks.filter((x: { severity: string }) => x.severity === 'error')) {
      expect(c.affected, c.check).toBe(0)
    }
    expect(q.totals.incidents).toBe(46)
    expect(q.resolution.byPriority.every((p: { resolved: number }) => p.resolved > 0)).toBe(true)
    expect(q.satisfaction.responses).toBeGreaterThan(10)
  })

  it('CP-DEMO-05: las encuestas respetan RN-012 (quien registró, sin autoevaluación, una por cierre)', async () => {
    const r = await one(`select count(*)::int invalidas from app.surveys s
      join app.incidents i on i.code = s.incident_code
      join app.closures c on c.id = s.closure_id
      where s.user_id <> i.reported_by or i.reported_by = i.responsible_id or i.reported_by = c.closed_by`)
    expect(r).toEqual({ invalidas: 0 })
  })

  it('CP-DEMO-06: la aplicación funciona sobre los datos cargados (incluida la reasignación pendiente)', async () => {
    const list = await t.rpc('list_incidents', { p_token: admin })
    expect(list).toHaveLength(46)
    const pending = list.filter((i: { pendingReassignment: boolean }) => i.pendingReassignment)
    expect(pending).toHaveLength(1)
    expect(pending[0].allowedActions).toContain('reassign')
    const closed = list.find((i: { status: string }) => i.status === 'Cerrado' && i.code > 'ER-2026-0006')
    const detail = await t.rpc('get_incident', { p_token: admin, p_code: closed.code })
    expect(detail.actas[0]).toMatchObject({ kind: 'Definitiva', status: 'Vigente' })
    const states = detail.followUps.filter((f: { kind: string }) => ['Registro', 'Cambio de estado', 'Asignación'].includes(f.kind))
    expect(states.map((f: { newStatus: string }) => f.newStatus)).toEqual(
      ['Nuevo', 'En revisión', 'Asignado', 'En atención', 'Resuelto', 'Cerrado'])
  })

  it('CP-DEMO-07: los casos de convivencia siguen el modelo del D.S. 021-2026-MINEDU', async () => {
    const r = await one<Record<string, number>>(`select
      (select count(*)::int from app.incidents where code >= 'ER-2026-0007' and category = 'Convivencia') convivencia,
      (select count(*)::int from app.incidents where code >= 'ER-2026-0007' and status in ('Asignado','En atención','Resuelto','Cerrado')
         and formal_registered_at is null) asignadas_sin_registro_formal,
      (select count(*)::int from app.incidents where code >= 'ER-2026-0007' and formal_registered_at is null) pendientes_de_registro_formal,
      (select count(*)::int from app.case_measures m join app.case_participants p on p.id = m.participant_id
         where p.statement_status = 'Pendiente' or (p.statement_at is not null and p.statement_at > m.decided_at)) medidas_sin_version_previa,
      (select count(*)::int from app.case_measures m join app.incidents i on i.code = m.incident_code join app.users u on u.id = m.decided_by
         where i.severity in ('Grave','Muy grave') and u.role <> 'Administrador') medidas_graves_sin_direccion,
      (select count(*)::int from app.incidents where severity in ('Grave','Muy grave') and director_notified_at is null) graves_sin_aviso,
      (select count(*)::int from app.incidents where regime in ('Violencia','Disciplina y violencia') and status <> 'Descartado' and siseve_code is null) violencia_sin_siseve,
      (select count(*)::int from app.incidents where severity in ('Grave','Muy grave') and director_ack_at is null and status not in ('Cerrado','Descartado')) direccion_pendiente,
      (select count(*)::int from app.case_meetings where signature_status = 'Se negó a firmar') negativas_a_firmar,
      (select count(*)::int from app.case_measures where is_separation) separaciones`)
    expect(r).toEqual({
      convivencia: 12, asignadas_sin_registro_formal: 0, pendientes_de_registro_formal: 2, medidas_sin_version_previa: 0,
      medidas_graves_sin_direccion: 0, graves_sin_aviso: 0, violencia_sin_siseve: 0, direccion_pendiente: 1,
      negativas_a_firmar: 1, separaciones: 1,
    })
    // El acta definitiva de un caso de convivencia guarda el caso; la versión del estudiante no
    const closed = await one<{ number: string }>(`select a.number from app.actas a join app.incidents i on i.code = a.incident_code
      where i.category = 'Convivencia' and a.kind = 'Definitiva' and a.status = 'Vigente' order by a.number limit 1`)
    const acta = await t.rpc('get_acta', { p_token: admin, p_number: closed.number })
    expect(acta.content.case.participants.length).toBeGreaterThan(0)
    expect(acta.content.case.formalRegisteredBy).not.toBeNull()
  })
})
