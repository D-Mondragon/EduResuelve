import { beforeEach, describe, expect, it } from 'vitest'
import { formalData, setupDb, USER_ID, validIncident, type TestDb } from './helpers'

describe('Flujo de incidencias y reglas de negocio (RN-001 … RN-010)', () => {
  let t: TestDb
  let admin: string
  let orientador: string
  let docente: string
  let estudiante: string

  beforeEach(async () => {
    t = await setupDb()
    admin = await t.login('greta')
    orientador = await t.login('estela')
    docente = await t.login('camila')
    estudiante = await t.login('alicia')
  })

  async function createIncident(token = estudiante) {
    const { code } = await t.rpc('create_incident', { p_token: token, p_data: validIncident })
    return code as string
  }

  it('RN-001: toda incidencia nueva inicia en "Nuevo" con código ER-AAAA-XXXX generado por la BD', async () => {
    const code = await createIncident()
    expect(code).toMatch(/^ER-\d{4}-\d{4}$/)
    const second = await createIncident()
    expect(Number(second.slice(-4))).toBe(Number(code.slice(-4)) + 1)
    const detail = await t.rpc('get_incident', { p_token: estudiante, p_code: code })
    expect(detail.status).toBe('Nuevo')
    expect(detail.followUps[0]).toMatchObject({ kind: 'Registro', newStatus: 'Nuevo' })
  })

  it('RN-001: valida campos obligatorios y fecha no futura', async () => {
    await t.expectError(
      t.rpc('create_incident', { p_token: estudiante, p_data: { ...validIncident, title: '  ' } }),
      'P0001', 'título')
    await t.expectError(
      t.rpc('create_incident', { p_token: estudiante, p_data: { ...validIncident, incidentDate: '2999-01-01' } }),
      'P0001', 'no puede ser futura')
    await t.expectError(
      t.rpc('create_incident', { p_token: estudiante, p_data: { ...validIncident, category: 'Otra' } }),
      'P0001', 'categoría')
  })

  it('RN-002: no se puede asignar sin pasar por revisión', async () => {
    const code = await createIncident()
    await t.expectError(
      t.rpc('transition_incident', {
        p_token: admin, p_code: code, p_action: 'assign', p_observation: 'x', p_responsible: USER_ID.camila,
      }),
      'PT403')
  })

  it('RN-003: cada cambio de estado registra usuario, fecha, estado anterior y nuevo', async () => {
    const code = await createIncident()
    await t.rpc('transition_incident', {
      p_token: orientador, p_code: code, p_action: 'review', p_observation: 'Revisión iniciada',
    })
    const detail = await t.rpc('get_incident', { p_token: orientador, p_code: code })
    const last = detail.followUps.at(-1)
    expect(last).toMatchObject({
      previousStatus: 'Nuevo', newStatus: 'En revisión', observation: 'Revisión iniciada',
      user: { id: USER_ID.estela },
    })
    expect(Date.parse(last.createdAt)).not.toBeNaN()
  })

  it('RN-004: asignar exige responsable activo con rol válido', async () => {
    const code = await createIncident()
    await t.rpc('transition_incident', { p_token: orientador, p_code: code, p_action: 'review', p_observation: 'ok' })
    await t.rpc('register_formal', { p_token: orientador, p_code: code, p_data: formalData })
    const assign = (responsible: string | null) => t.rpc('transition_incident', {
      p_token: orientador, p_code: code, p_action: 'assign', p_observation: 'Asignación', p_responsible: responsible,
    })
    await t.expectError(assign(null), 'P0001', 'responsable válido')
    await t.expectError(assign(USER_ID.bruno), 'P0001', 'responsable válido') // Estudiante
    await t.expectError(assign(USER_ID.damian), 'P0001', 'responsable válido') // Inactivo
    await assign(USER_ID.camila)
    const detail = await t.rpc('get_incident', { p_token: docente, p_code: code })
    expect(detail.status).toBe('Asignado')
    expect(detail.responsible.id).toBe(USER_ID.camila)
  })

  it('RN-005: resolver exige resumen, acciones, resultado y fecha válida', async () => {
    // ER-2026-0003 está En atención con responsable Greta (Administradora)
    const resolve = (data: Record<string, string>) =>
      t.rpc('resolve_incident', { p_token: admin, p_code: 'ER-2026-0003', p_data: data })
    const base = { summary: 'Resumen', actionsTaken: 'Acciones', result: 'Resultado', resolutionDate: '2026-10-01' }
    await t.expectError(resolve({ ...base, summary: '' }), 'P0001', 'resumen')
    await t.expectError(resolve({ ...base, actionsTaken: '' }), 'P0001', 'acciones')
    await t.expectError(resolve({ ...base, result: '' }), 'P0001', 'resultado')
    await t.expectError(resolve({ ...base, resolutionDate: '2026-01-01' }), 'P0001', 'anterior a la fecha del incidente')
    await resolve(base)
    const detail = await t.rpc('get_incident', { p_token: admin, p_code: 'ER-2026-0003' })
    expect(detail.status).toBe('Resuelto')
    expect(detail.resolution.summary).toBe('Resumen')
  })

  it('RN-006: cerrar exige confirmación y rol autorizado (Orientador / Administrador)', async () => {
    await t.expectError(
      t.rpc('close_incident', { p_token: orientador, p_code: 'ER-2026-0005', p_observations: '', p_confirm: false }),
      'P0001', 'Confirma')
    await t.expectError(
      t.rpc('close_incident', { p_token: docente, p_code: 'ER-2026-0005', p_observations: '', p_confirm: true }),
      'PT404') // el docente ni siquiera ve la incidencia
    await t.rpc('close_incident', { p_token: orientador, p_code: 'ER-2026-0005', p_observations: 'OK', p_confirm: true })
    const detail = await t.rpc('get_incident', { p_token: admin, p_code: 'ER-2026-0005' })
    expect(detail.status).toBe('Cerrado')
    expect(detail.closure.closedBy.id).toBe(USER_ID.estela)
  })

  it('RN-007: descartar exige motivo', async () => {
    const discard = (reason: string) => t.rpc('transition_incident', {
      p_token: orientador, p_code: 'ER-2026-0001', p_action: 'discard', p_reason: reason,
    })
    await t.expectError(discard('  '), 'P0001', 'Debe indicar el motivo del descarte.')
    await discard('Duplicada')
    const detail = await t.rpc('get_incident', { p_token: admin, p_code: 'ER-2026-0001' })
    expect(detail.status).toBe('Descartado')
    expect(detail.followUps.at(-1).reason).toBe('Duplicada')
    expect(detail.allowedActions).toEqual([])
  })

  it('RN-008: reabrir exige autorización (solo Administrador) y motivo', async () => {
    const reopen = (token: string, reason: string) => t.rpc('transition_incident', {
      p_token: token, p_code: 'ER-2026-0004', p_action: 'reopen', p_reason: reason,
    })
    await t.expectError(reopen(orientador, 'Motivo'), 'PT403')
    await t.expectError(reopen(admin, ''), 'P0001', 'Debe indicar el motivo de la reapertura.')
    await reopen(admin, 'La familia solicita nuevo seguimiento')
    const detail = await t.rpc('get_incident', { p_token: admin, p_code: 'ER-2026-0004' })
    expect(detail.status).toBe('En revisión')
    expect(detail.resolution).toBeNull()
    expect(detail.closure).toBeNull()
  })

  it('RN-009: el historial y la auditoría no se pueden modificar ni borrar', async () => {
    await t.expectError(t.db.query('update app.follow_ups set observation = $1', ['x']), 'PT403')
    await t.expectError(t.db.query('delete from app.audit_logs'), 'PT403')
  })

  it('RN-010: visibilidad por rol', async () => {
    const own = await createIncident(estudiante)
    const studentList = await t.rpc('list_incidents', { p_token: estudiante })
    expect(studentList.map((i: { code: string }) => i.code).sort()).toEqual(['ER-2026-0001', own].sort())

    const docenteList = await t.rpc('list_incidents', { p_token: docente })
    // Camila registró 0002 y 0003, y es responsable de 0002
    expect(docenteList.map((i: { code: string }) => i.code).sort()).toEqual(['ER-2026-0002', 'ER-2026-0003'])

    expect(await t.rpc('list_incidents', { p_token: orientador })).toHaveLength(6)
    await t.expectError(t.rpc('get_incident', { p_token: estudiante, p_code: 'ER-2026-0002' }), 'PT404')
  })

  it('RN-010: el docente responsable atiende y resuelve; el estudiante no puede revisar', async () => {
    await t.expectError(
      t.rpc('transition_incident', { p_token: estudiante, p_code: 'ER-2026-0001', p_action: 'assign', p_observation: 'x' }),
      'PT403')
    await t.rpc('transition_incident', { p_token: docente, p_code: 'ER-2026-0002', p_action: 'start', p_observation: 'Inicio' })
    await t.rpc('resolve_incident', {
      p_token: docente, p_code: 'ER-2026-0002',
      p_data: { summary: 'S', actionsTaken: 'A', result: 'R', resolutionDate: '2026-10-02' },
    })
    expect((await t.rpc('get_incident', { p_token: docente, p_code: 'ER-2026-0002' })).status).toBe('Resuelto')
  })

  it('D3: quien registró puede editar solo en Nuevo / En revisión y queda en el historial', async () => {
    const code = await createIncident()
    await t.rpc('update_incident', { p_token: estudiante, p_code: code, p_data: { ...validIncident, title: 'Título corregido' } })
    let detail = await t.rpc('get_incident', { p_token: estudiante, p_code: code })
    expect(detail.title).toBe('Título corregido')
    expect(detail.followUps.at(-1)).toMatchObject({ kind: 'Edición', observation: 'Campos modificados: título.' })

    await t.rpc('transition_incident', { p_token: orientador, p_code: code, p_action: 'review', p_observation: 'ok' })
    await t.rpc('register_formal', { p_token: orientador, p_code: code, p_data: formalData })
    await t.rpc('transition_incident', {
      p_token: orientador, p_code: code, p_action: 'assign', p_observation: 'ok', p_responsible: USER_ID.fabian,
    })
    await t.expectError(
      t.rpc('update_incident', { p_token: estudiante, p_code: code, p_data: validIncident }), 'PT403')
    detail = await t.rpc('get_incident', { p_token: estudiante, p_code: code })
    expect(detail.allowedActions).not.toContain('edit')
  })

  it('Notificaciones: asignar notifica al responsable y al autor; se marcan como leídas', async () => {
    const code = await createIncident()
    await t.rpc('transition_incident', { p_token: orientador, p_code: code, p_action: 'review', p_observation: 'ok' })
    await t.rpc('register_formal', { p_token: orientador, p_code: code, p_data: formalData })
    await t.rpc('transition_incident', {
      p_token: orientador, p_code: code, p_action: 'assign', p_observation: 'ok', p_responsible: USER_ID.camila,
    })
    const forDocente = await t.rpc('list_notifications', { p_token: docente })
    expect(forDocente.items[0]).toMatchObject({ title: 'Se te asignó una incidencia', incidentCode: code })
    const forStudent = await t.rpc('list_notifications', { p_token: estudiante })
    expect(forStudent.unread).toBe(2)
    await t.rpc('mark_notifications_read', { p_token: estudiante })
    expect((await t.rpc('list_notifications', { p_token: estudiante })).unread).toBe(0)
  })

  it('Auditoría: solo el Administrador la consulta y registra las acciones', async () => {
    await t.expectError(t.rpc('list_audit', { p_token: orientador }), 'PT403')
    await createIncident()
    const audit = await t.rpc('list_audit', { p_token: admin })
    const actions = audit.map((entry: { action: string }) => entry.action)
    expect(actions).toContain('Registro de incidencia')
    expect(actions).toContain('Inicio de sesión')
  })
})
