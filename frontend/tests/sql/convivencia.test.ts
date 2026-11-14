import { beforeEach, describe, expect, it } from 'vitest'
import { formalData, setupDb, USER_ID, validIncident, type TestDb } from './helpers'

/* Registro formal y convivencia escolar: D.S. 021-2026-MINEDU (8.2, 9.1, IX) y R.M. 383-2025-MINEDU. */
describe('Registro formal y convivencia (D.S. 021-2026-MINEDU)', () => {
  let t: TestDb
  let estudiante: string
  let docente: string
  let orientador: string
  let admin: string

  beforeEach(async () => {
    t = await setupDb()
    ;[estudiante, docente, orientador, admin] = await Promise.all([
      t.login('alicia'), t.login('camila'), t.login('estela'), t.login('greta'),
    ])
  })

  async function studentReport() {
    const { code } = await t.rpc('create_incident', { p_token: estudiante, p_data: validIncident })
    await t.rpc('transition_incident', { p_token: orientador, p_code: code, p_action: 'review', p_observation: 'Revisión' })
    return code as string
  }

  async function disciplineCase(regime = 'Disciplina') {
    const code = await studentReport()
    await t.rpc('register_formal', { p_token: orientador, p_code: code, p_data: { ...formalData, regime } })
    const { id } = await t.rpc('case_save', {
      p_token: orientador, p_code: code, p_kind: 'participant',
      p_data: { role: 'Estudiante involucrado', fullName: 'Mateo Prueba Uno', dni: '71234567', gradeSection: '3.º B', statementStatus: 'Pendiente' },
    })
    return { code, participantId: id as number }
  }

  const detail = (token: string, code: string) => t.rpc('get_incident', { p_token: token, p_code: code })

  it('CP-CON-01: el estudiante reporta, pero el registro formal lo hace el personal y él no ve los datos del caso', async () => {
    const code = await studentReport()
    await t.expectError(
      t.rpc('register_formal', { p_token: estudiante, p_code: code, p_data: formalData }), 'PT403', 'personal de la institución',
    )
    const own = await detail(estudiante, code)
    expect(own.case).toBeNull()
    expect(own.allowedActions).not.toContain('formal')
    const staff = await detail(orientador, code)
    expect(staff.case).toMatchObject({ formalRegisteredAt: null, canManage: true })
    expect(staff.allowedActions).toContain('formal')
  })

  it('CP-CON-02: el docente que reporta completa el registro formal en el mismo paso', async () => {
    const { code } = await t.rpc('create_incident', {
      p_token: docente, p_data: { ...validIncident, formal: { ...formalData, regime: 'Disciplina' } },
    })
    const d = await detail(docente, code)
    expect(d.case).toMatchObject({ regime: 'Disciplina', incidentTime: '10:30', formalRegisteredBy: { id: USER_ID.camila } })
    expect(d.followUps.map((f: { kind: string }) => f.kind)).toEqual(['Registro', 'Registro formal'])
    // Un estudiante no puede registrar formalmente al crear
    await t.expectError(
      t.rpc('create_incident', { p_token: estudiante, p_data: { ...validIncident, formal: formalData } }), 'PT403',
    )
  })

  it('CP-CON-03: no se puede asignar sin registro formal', async () => {
    const code = await studentReport()
    await t.expectError(
      t.rpc('transition_incident', {
        p_token: orientador, p_code: code, p_action: 'assign', p_observation: 'x', p_responsible: USER_ID.camila,
      }),
      'P0001', 'registro formal',
    )
    await t.rpc('register_formal', { p_token: orientador, p_code: code, p_data: formalData })
    const result = await t.rpc('transition_incident', {
      p_token: orientador, p_code: code, p_action: 'assign', p_observation: 'x', p_responsible: USER_ID.camila,
    })
    expect(result.status).toBe('Asignado')
  })

  it('CP-CON-04: el registro formal exige hora, acciones inmediatas y la declaración de objetividad', async () => {
    const code = await studentReport()
    const register = (data: Record<string, unknown>) =>
      t.rpc('register_formal', { p_token: orientador, p_code: code, p_data: { ...formalData, ...data } })
    await t.expectError(register({ incidentTime: '25:00' }), 'P0001', 'hora del hecho')
    await t.expectError(register({ immediateActions: ' ' }), 'P0001', 'acciones inmediatas')
    await t.expectError(register({ objective: false }), 'P0001', 'objetiva')
    await t.expectError(register({ regime: 'Penal' }), 'P0001', 'régimen')
    await register({})
    // Actualizarlo conserva a quien hizo el registro original
    await t.rpc('register_formal', { p_token: admin, p_code: code, p_data: { ...formalData, regime: 'Violencia' } })
    const d = await detail(admin, code)
    expect(d.case).toMatchObject({ regime: 'Violencia', formalRegisteredBy: { id: USER_ID.estela } })
  })

  it('CP-CON-05: los datos del caso solo se registran en los regímenes disciplinario o de violencia', async () => {
    const code = await studentReport()
    await t.rpc('register_formal', { p_token: orientador, p_code: code, p_data: formalData })
    await t.expectError(
      t.rpc('case_save', {
        p_token: orientador, p_code: code, p_kind: 'participant',
        p_data: { role: 'Testigo', fullName: 'Ana Testigo', statementStatus: 'Pendiente' },
      }),
      'P0001', 'no está en el régimen',
    )
    await t.expectError(
      t.rpc('case_save', {
        p_token: estudiante, p_code: code, p_kind: 'participant',
        p_data: { role: 'Testigo', fullName: 'Ana Testigo', statementStatus: 'Pendiente' },
      }),
      'PT403',
    )
  })

  it('CP-CON-06: la medida exige calificar la falta y consignar antes la versión del estudiante', async () => {
    const { code, participantId } = await disciplineCase()
    const measure = (token: string, extra: Record<string, unknown> = {}) =>
      t.rpc('case_save', {
        p_token: token, p_code: code, p_kind: 'measure',
        p_data: { participantId, kind: 'Formativa', description: 'Reflexión guiada con Orientación.', ...extra },
      })
    await t.expectError(measure(orientador), 'P0001', 'califica la falta')
    await t.rpc('update_case', { p_token: orientador, p_code: code, p_data: { severity: 'Leve' } })
    await t.expectError(measure(orientador), 'P0001', 'versión de los hechos')

    await t.expectError(
      t.rpc('case_save', {
        p_token: orientador, p_code: code, p_kind: 'participant',
        p_data: { id: participantId, role: 'Estudiante involucrado', fullName: 'Mateo Prueba Uno', statementStatus: 'Registrada', statement: '' },
      }),
      'P0001', 'versión de los hechos',
    )
    await t.rpc('case_save', {
      p_token: orientador, p_code: code, p_kind: 'participant',
      p_data: {
        id: participantId, role: 'Estudiante involucrado', fullName: 'Mateo Prueba Uno', dni: '71234567', gradeSection: '3.º B',
        statementStatus: 'Registrada', statementBy: 'Estudiante', statement: 'Dice que fue un juego que se salió de control.',
      },
    })
    await measure(orientador)
    const d = await detail(orientador, code)
    expect(d.case.measures).toHaveLength(1)
    expect(d.case.participants[0]).toMatchObject({ statementStatus: 'Registrada', statementBy: 'Estudiante' })
    expect(d.case.participants[0].statementAt).not.toBeNull()
  })

  it('CP-CON-07: una falta grave se comunica a Dirección, que confirma; solo Dirección decide la medida', async () => {
    const { code, participantId } = await disciplineCase()
    await t.rpc('case_save', {
      p_token: orientador, p_code: code, p_kind: 'participant',
      p_data: { id: participantId, role: 'Estudiante involucrado', fullName: 'Mateo Prueba Uno', statementStatus: 'Se abstuvo' },
    })
    await t.rpc('update_case', { p_token: orientador, p_code: code, p_data: { severity: 'Grave' } })

    const { rows } = await t.db.query<{ n: number }>(
      `select count(*)::int n from app.notifications where user_id = $1 and incident_code = $2 and title like 'Falta grave%'`,
      [USER_ID.greta, code],
    )
    expect(rows[0].n).toBe(1)
    let d = await detail(orientador, code)
    expect(d.case.directorNotifiedAt).not.toBeNull()
    expect(d.case.directorLate).toBe(false)
    const listed = (await t.rpc('list_incidents', { p_token: admin })).find((i: { code: string }) => i.code === code)
    expect(listed).toMatchObject({ severity: 'Grave', directorPending: true })
    expect(listed.allowedActions).toContain('acknowledge')

    await t.expectError(t.rpc('acknowledge_director', { p_token: orientador, p_code: code }), 'PT403')
    const measure = (token: string) => t.rpc('case_save', {
      p_token: token, p_code: code, p_kind: 'measure',
      p_data: { participantId, kind: 'Disciplinaria', description: 'Suspensión de actividades extracurriculares.' },
    })
    await t.expectError(measure(orientador), 'PT403', 'Dirección')
    await t.rpc('acknowledge_director', { p_token: admin, p_code: code })
    await measure(admin)
    d = await detail(admin, code)
    expect(d.case.directorAckBy.id).toBe(USER_ID.greta)
    expect(d.allowedActions).not.toContain('acknowledge')
  })

  it('CP-CON-08: la separación solo procede ante faltas muy graves', async () => {
    const { code, participantId } = await disciplineCase()
    await t.rpc('case_save', {
      p_token: orientador, p_code: code, p_kind: 'participant',
      p_data: { id: participantId, role: 'Estudiante involucrado', fullName: 'Mateo Prueba Uno', statementStatus: 'Se abstuvo' },
    })
    await t.rpc('update_case', { p_token: admin, p_code: code, p_data: { severity: 'Grave' } })
    const separation = () => t.rpc('case_save', {
      p_token: admin, p_code: code, p_kind: 'measure',
      p_data: { participantId, kind: 'Disciplinaria', description: 'Separación definitiva.', isSeparation: true },
    })
    await t.expectError(separation(), 'P0001', 'muy graves')
    await t.rpc('update_case', { p_token: admin, p_code: code, p_data: { severity: 'Muy grave' } })
    await separation()
  })

  it('CP-CON-09: protocolo de violencia: tipo, SíseVe, folio del Libro, derivación y reunión con la familia', async () => {
    const { code } = await disciplineCase('Disciplina y violencia')
    await t.rpc('update_case', {
      p_token: orientador, p_code: code,
      p_data: { violenceType: 'Física', violenceModality: 'Entre estudiantes', siseveCode: 'SV-2026-000123', bookFolio: '045' },
    })
    await t.rpc('case_save', {
      p_token: orientador, p_code: code, p_kind: 'referral',
      p_data: { entity: 'DEMUNA', officeNumber: 'Oficio N.° 015-2026-IE', referralDate: '2026-10-02' },
    })
    await t.rpc('case_save', {
      p_token: orientador, p_code: code, p_kind: 'meeting',
      p_data: {
        meetingDate: '2026-10-02', attendees: 'Madre del estudiante, tutora y orientadora',
        agreements: 'La familia acompañará las tareas de reflexión; seguimiento semanal por 4 semanas.', signatureStatus: 'Se negó a firmar',
      },
    })
    await t.expectError(
      t.rpc('case_save', {
        p_token: orientador, p_code: code, p_kind: 'referral',
        p_data: { entity: 'DEMUNA', officeNumber: 'X', referralDate: '2099-01-01' },
      }),
      'P0001', 'fecha de la derivación',
    )
    const d = await detail(orientador, code)
    expect(d.case).toMatchObject({ violenceType: 'Física', siseveCode: 'SV-2026-000123', bookFolio: '045' })
    expect(d.case.referrals[0]).toMatchObject({ entity: 'DEMUNA', officeNumber: 'Oficio N.° 015-2026-IE' })
    expect(d.case.meetings[0]).toMatchObject({ signatureStatus: 'Se negó a firmar' })

    // Los datos del protocolo no aplican a un caso solo disciplinario
    const other = await disciplineCase('Disciplina')
    await t.expectError(
      t.rpc('update_case', { p_token: orientador, p_code: other.code, p_data: { siseveCode: 'SV-1' } }), 'P0001', 'violencia',
    )
  })

  it('CP-CON-10: eliminar exige motivo y no se quita a un estudiante con medidas', async () => {
    const { code, participantId } = await disciplineCase()
    await t.rpc('case_save', {
      p_token: orientador, p_code: code, p_kind: 'participant',
      p_data: { id: participantId, role: 'Estudiante involucrado', fullName: 'Mateo Prueba Uno', statementStatus: 'Se abstuvo' },
    })
    await t.rpc('update_case', { p_token: orientador, p_code: code, p_data: { severity: 'Leve' } })
    const { id: measureId } = await t.rpc('case_save', {
      p_token: orientador, p_code: code, p_kind: 'measure',
      p_data: { participantId, kind: 'Correctiva', description: 'Reparación del material dañado.' },
    })
    const remove = (kind: string, id: number, reason: string) =>
      t.rpc('case_remove', { p_token: orientador, p_code: code, p_kind: kind, p_id: id, p_reason: reason })
    await t.expectError(remove('participant', participantId, 'x'), 'P0001', 'medidas registradas')
    await t.expectError(remove('measure', measureId, ' '), 'P0001', 'motivo')
    await remove('measure', measureId, 'Se registró por error.')
    await remove('participant', participantId, 'No participó.')
    const d = await detail(orientador, code)
    expect(d.case.participants).toHaveLength(0)
    expect(d.followUps.at(-1)).toMatchObject({ kind: 'Convivencia', reason: 'No participó.' })
  })

  it('CP-CON-11: el acta guarda el caso; la versión del estudiante no lo incluye', async () => {
    const { code, participantId } = await disciplineCase()
    await t.rpc('case_save', {
      p_token: orientador, p_code: code, p_kind: 'participant',
      p_data: { id: participantId, role: 'Estudiante involucrado', fullName: 'Mateo Prueba Uno', dni: '71234567', statementStatus: 'Se abstuvo' },
    })
    await t.rpc('transition_incident', {
      p_token: orientador, p_code: code, p_action: 'assign', p_observation: 'x', p_responsible: USER_ID.estela,
    })
    await t.rpc('transition_incident', { p_token: orientador, p_code: code, p_action: 'start', p_observation: 'x' })
    await t.rpc('resolve_incident', {
      p_token: orientador, p_code: code,
      p_data: { summary: 'S', actionsTaken: 'A', result: 'R', observations: '', resolutionDate: '2026-10-05' },
    })
    const number = (await detail(orientador, code)).actas[0].number
    const full = await t.rpc('get_acta', { p_token: orientador, p_number: number })
    expect(full.content.case).toMatchObject({ regime: 'Disciplina', incidentTime: '10:30' })
    expect(full.content.case.participants[0]).toMatchObject({ fullName: 'Mateo Prueba Uno', dni: '71234567' })
    expect(full.content.case.formalRegisteredBy).toMatchObject({ role: 'Orientador' })
    const summary = await t.rpc('get_acta', { p_token: estudiante, p_number: number })
    expect(summary.content.case).toBeUndefined()
    // Una vez resuelta, ya no se documenta el caso desde el docente no asignado
    const camila = await detail(docente, code).catch(() => null)
    expect(camila).toBeNull()
  })
})
