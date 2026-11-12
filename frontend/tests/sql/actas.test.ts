import { beforeEach, describe, expect, it } from 'vitest'
import { setupDb, type TestDb } from './helpers'

const resolution = {
  summary: 'Se selló la ventana del aula 4.',
  actionsTaken: 'Inspección, sellado con silicona y prueba de filtración.',
  result: 'El aula quedó sin filtraciones.',
  observations: 'Revisar nuevamente en temporada de lluvias.',
  resolutionDate: '2026-10-02',
}

describe('Actas de resolución (RN-011)', () => {
  let t: TestDb
  let admin: string
  let orientador: string
  let docente: string

  beforeEach(async () => {
    t = await setupDb()
    admin = await t.login('greta')
    orientador = await t.login('estela')
    docente = await t.login('camila')
  })

  async function actaRow(number: string) {
    const { rows } = await t.db.query<{ content: unknown; content_hash: string; status: string }>(
      'select content, content_hash, status from app.actas where number = $1', [number])
    return rows[0]
  }

  it('CP-ACT-01: los datos demo ya tienen sus actas (Resuelto → provisional; Cerrado → definitiva vigente)', async () => {
    const resolved = await t.rpc('get_incident', { p_token: admin, p_code: 'ER-2026-0005' })
    expect(resolved.actas).toHaveLength(1)
    expect(resolved.actas[0]).toMatchObject({ number: 'ACT-2026-0005-01', kind: 'Provisional', status: 'Vigente' })

    const closed = await t.rpc('get_incident', { p_token: admin, p_code: 'ER-2026-0004' })
    expect(closed.actas.map((a: { number: string; kind: string; status: string }) => [a.number, a.kind, a.status]))
      .toEqual([
        ['ACT-2026-0004-02', 'Definitiva', 'Vigente'],
        ['ACT-2026-0004-01', 'Provisional', 'Reemplazada'],
      ])
    expect(closed.actas[0].verificationCode).toMatch(/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/)
  })

  it('CP-ACT-02: al resolver se emite un acta provisional con todo lo documentado', async () => {
    await t.rpc('resolve_incident', { p_token: admin, p_code: 'ER-2026-0003', p_data: resolution })
    const detail = await t.rpc('get_incident', { p_token: admin, p_code: 'ER-2026-0003' })
    expect(detail.actas).toHaveLength(1)
    const acta = await t.rpc('get_acta', { p_token: admin, p_number: detail.actas[0].number })

    expect(acta).toMatchObject({ number: 'ACT-2026-0003-01', kind: 'Provisional', status: 'Vigente', version: 'Completa' })
    const c = acta.content
    expect(c.incident).toMatchObject({ code: 'ER-2026-0003', title: 'Filtración de agua en el aula 4', priority: 'Crítica' })
    expect(c.incident.involvedPeople).toBe('Personal docente del aula 4')
    expect(c.reporter).toEqual({ fullName: 'Camila Ficticia', role: 'Docente', dni: '70****03' })
    expect(c.responsible.fullName).toBe('Greta Demostración')
    expect(c.resolution).toMatchObject({ summary: resolution.summary, actionsTaken: resolution.actionsTaken, result: resolution.result })
    expect(c.followUps.at(-1)).toMatchObject({ newStatus: 'Resuelto' })
    expect(c.metrics.hoursToResolve).toBeGreaterThan(0)
    expect(c.closure).toBeNull()
  })

  it('CP-ACT-03: al cerrar se emite el acta definitiva y la provisional queda reemplazada; se avisa al registrante', async () => {
    await t.rpc('close_incident', { p_token: orientador, p_code: 'ER-2026-0005', p_observations: 'Validado.', p_confirm: true })
    const detail = await t.rpc('get_incident', { p_token: admin, p_code: 'ER-2026-0005' })
    expect(detail.actas[0]).toMatchObject({ number: 'ACT-2026-0005-02', kind: 'Definitiva', status: 'Vigente' })
    expect(detail.actas[1]).toMatchObject({ kind: 'Provisional', status: 'Reemplazada' })
    const acta = await t.rpc('get_acta', { p_token: admin, p_number: 'ACT-2026-0005-02' })
    expect(acta.content.closure).toMatchObject({ observations: 'Validado.', closedBy: { fullName: 'Estela Inventada' } })
  })

  it('CP-ACT-04: reabrir marca el acta como reemplazada y una nueva resolución emite la versión siguiente', async () => {
    await t.rpc('transition_incident', {
      p_token: admin, p_code: 'ER-2026-0004', p_action: 'reopen', p_reason: 'Nuevo pedido de la familia',
    })
    let detail = await t.rpc('get_incident', { p_token: admin, p_code: 'ER-2026-0004' })
    expect(detail.actas.every((a: { status: string }) => a.status === 'Reemplazada')).toBe(true)
    expect(detail.actas[0].replacedReason).toContain('Nuevo pedido de la familia')

    for (const [action, extra] of [['assign', { p_responsible: '00000000-0000-4000-a000-000000000006' }], ['start', {}]] as const) {
      await t.rpc('transition_incident', { p_token: admin, p_code: 'ER-2026-0004', p_action: action, p_observation: 'Paso', ...extra })
    }
    await t.rpc('resolve_incident', { p_token: admin, p_code: 'ER-2026-0004', p_data: { ...resolution, resolutionDate: '2026-10-05' } })
    detail = await t.rpc('get_incident', { p_token: admin, p_code: 'ER-2026-0004' })
    expect(detail.actas[0]).toMatchObject({ number: 'ACT-2026-0004-03', kind: 'Provisional', status: 'Vigente' })
  })

  it('CP-ACT-05: el acta es inmutable (contenido, huella y borrado) y su huella coincide con el contenido', async () => {
    const row = await actaRow('ACT-2026-0004-02')
    const { rows } = await t.db.query<{ h: string }>(
      "select encode(extensions.digest(content::text, 'sha256'), 'hex') as h from app.actas where number = 'ACT-2026-0004-02'")
    expect(rows[0].h).toBe(row.content_hash)

    await expect(t.db.query("update app.actas set content = '{}'::jsonb where number = 'ACT-2026-0004-02'")).rejects.toThrow(/inmutable/)
    await expect(t.db.query("update app.actas set content_hash = 'x' where number = 'ACT-2026-0004-02'")).rejects.toThrow(/inmutable/)
    await expect(t.db.query("delete from app.actas where number = 'ACT-2026-0004-01'")).rejects.toThrow(/inmutable/)
    // Una reemplazada no puede volver a vigente
    await expect(t.db.query("update app.actas set status = 'Vigente' where number = 'ACT-2026-0004-01'")).rejects.toThrow(/inmutable/)
  })

  it('CP-ACT-06: los cambios posteriores no alteran un acta ya emitida', async () => {
    const before = await actaRow('ACT-2026-0005-01')
    await t.rpc('close_incident', { p_token: admin, p_code: 'ER-2026-0005', p_observations: 'Cierre', p_confirm: true })
    const after = await actaRow('ACT-2026-0005-01')
    expect(after.content).toEqual(before.content)
    expect(after.content_hash).toBe(before.content_hash)
    expect(after.status).toBe('Reemplazada')
  })

  it('CP-ACT-07: el Estudiante recibe la versión resumida, sin observaciones internas ni terceros', async () => {
    const bruno = await t.login('bruno') // registró ER-2026-0004
    const acta = await t.rpc('get_acta', { p_token: bruno, p_number: 'ACT-2026-0004-02' })
    expect(acta.version).toBe('Resumida')
    const c = acta.content
    expect(c.incident.involvedPeople).toBeUndefined()
    expect(c.incident.observations).toBeUndefined()
    expect(c.resolution.observations).toBeUndefined()
    expect(c.resolution.summary).toBeTruthy()
    expect(c.followUps[0].observation).toBeUndefined()
    expect(c.followUps[0].user).toEqual({ role: 'Estudiante' })
    expect(c.evidences).toEqual([])
    expect(acta.contentHash).toBe((await actaRow('ACT-2026-0004-02')).content_hash)
  })

  it('CP-ACT-08: solo accede quien puede ver la incidencia (RN-010) y cada consulta queda auditada', async () => {
    const alicia = await t.login('alicia')
    await t.expectError(t.rpc('get_acta', { p_token: alicia, p_number: 'ACT-2026-0004-02' }), 'PT404')
    await t.expectError(t.rpc('get_acta', { p_token: docente, p_number: 'ACT-2026-0005-01' }), 'PT404')
    await t.expectError(t.rpc('get_acta', { p_token: 'x'.repeat(64), p_number: 'ACT-2026-0005-01' }), 'PT401')

    await t.rpc('get_acta', { p_token: orientador, p_number: 'ACT-2026-0005-01' })
    const audit = await t.rpc('list_audit', { p_token: admin })
    expect(audit.some((a: { action: string; entityId: string }) => a.action === 'Consulta de acta' && a.entityId === 'ER-2026-0005')).toBe(true)
    expect(audit.some((a: { action: string }) => a.action === 'Emisión de acta')).toBe(true)
  })

  it('CP-ACT-09: la verificación pública confirma actas auténticas sin exponer datos personales', async () => {
    const detail = await t.rpc('get_incident', { p_token: admin, p_code: 'ER-2026-0004' })
    const [vigente, reemplazada] = detail.actas

    const ok = await t.rpc('verify_acta', { p_code: vigente.verificationCode.toLowerCase().replaceAll('-', ' ') })
    expect(ok).toMatchObject({ valid: true, number: 'ACT-2026-0004-02', kind: 'Definitiva', status: 'Vigente', category: 'Orientación' })
    const text = JSON.stringify(ok)
    expect(text).not.toMatch(/Bruno|Fabián|Familia y estudiante|7000000/)

    const old = await t.rpc('verify_acta', { p_code: reemplazada.verificationCode })
    expect(old).toMatchObject({ valid: true, status: 'Reemplazada', currentNumber: 'ACT-2026-0004-02' })

    expect(await t.rpc('verify_acta', { p_code: '0000-0000-0000-0000' })).toMatchObject({ valid: false })
    expect(await t.rpc('verify_acta', { p_code: 'abc' })).toMatchObject({ valid: false })
  })

  it('CP-ACT-10: las tablas de actas no son accesibles directamente por la API', async () => {
    const { rows } = await t.db.query<{ ok: boolean }>(
      "select has_function_privilege('public', 'app.emit_acta(text,text,uuid,text,timestamptz)', 'execute') as ok")
    expect(rows[0].ok).toBe(false)
  })
})
