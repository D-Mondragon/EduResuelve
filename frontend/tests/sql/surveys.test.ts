import { beforeEach, describe, expect, it } from 'vitest'
import { setupDb, USER_ID, validIncident, type TestDb } from './helpers'

const answer = { rating: 4, resolved: 'Sí', speedRating: 5, comment: 'Me atendieron con rapidez.' }

describe('Encuesta de satisfacción (RN-012)', () => {
  let t: TestDb
  let admin: string
  let orientador: string
  let bruno: string

  beforeEach(async () => {
    t = await setupDb()
    admin = await t.login('greta')
    orientador = await t.login('estela')
    bruno = await t.login('bruno') // registró ER-2026-0004 (Cerrada; atendió Fabián, cerró Estela)
  })

  const submit = (token: string, data: Record<string, unknown> = answer, code = 'ER-2026-0004') =>
    t.rpc('submit_survey', { p_token: token, p_code: code, p_data: data })

  it('CP-ENC-01: tras el cierre, quien registró tiene la encuesta pendiente como siguiente acción', async () => {
    const detail = await t.rpc('get_incident', { p_token: bruno, p_code: 'ER-2026-0004' })
    expect(detail.allowedActions).toContain('survey')
    expect(detail.survey).toEqual({ status: 'Pendiente', response: null })
    const list = await t.rpc('list_incidents', { p_token: bruno })
    expect(list.find((i: { code: string }) => i.code === 'ER-2026-0004').allowedActions).toContain('survey')
  })

  it('CP-ENC-02: solo responde quien registró, y no antes del cierre', async () => {
    await t.expectError(submit(orientador), 'PT403')
    await t.expectError(submit(admin), 'PT403')
    const camila = await t.login('camila') // registró ER-2026-0003, aún En atención
    await t.expectError(submit(camila, answer, 'ER-2026-0003'), 'PT403')
    const alicia = await t.login('alicia') // no puede ver ER-2026-0004
    await t.expectError(submit(alicia), 'PT404')
  })

  it('CP-ENC-03: valida calificaciones de 1 a 5, la pregunta de resolución y el largo del comentario', async () => {
    await t.expectError(submit(bruno, { ...answer, rating: 0 }), 'P0001', 'satisfacción general')
    await t.expectError(submit(bruno, { ...answer, rating: 'cinco' }), 'P0001', 'satisfacción general')
    await t.expectError(submit(bruno, { ...answer, resolved: 'Quizás' }), 'P0001', 'se resolvió')
    await t.expectError(submit(bruno, { ...answer, speedRating: 6 }), 'P0001', 'rapidez')
    await t.expectError(submit(bruno, { ...answer, comment: 'x'.repeat(501) }), 'P0001', '500')
  })

  it('CP-ENC-04: se responde una sola vez y la respuesta es inmutable', async () => {
    const saved = await submit(bruno)
    expect(saved).toMatchObject({ rating: 4, resolved: 'Sí', speedRating: 5 })
    await t.expectError(submit(bruno), 'PT403')

    const detail = await t.rpc('get_incident', { p_token: bruno, p_code: 'ER-2026-0004' })
    expect(detail.allowedActions).not.toContain('survey')
    expect(detail.survey.status).toBe('Respondida')

    await expect(t.db.query('update app.surveys set rating = 5')).rejects.toThrow(/inmutable/)
    await expect(t.db.query('delete from app.surveys')).rejects.toThrow(/inmutable/)
  })

  it('CP-ENC-05: los gestores ven la respuesta; el responsable docente no', async () => {
    let managerView = await t.rpc('get_incident', { p_token: orientador, p_code: 'ER-2026-0004' })
    expect(managerView.survey).toEqual({ status: 'Pendiente', response: null })
    expect(managerView.allowedActions).not.toContain('survey')

    await submit(bruno)
    managerView = await t.rpc('get_incident', { p_token: orientador, p_code: 'ER-2026-0004' })
    expect(managerView.survey.response).toMatchObject({ rating: 4, comment: 'Me atendieron con rapidez.', user: { fullName: 'Bruno Muestra' } })

    // ER-2026-0002: responsable Camila (Docente). La llevamos hasta el cierre.
    const camila = await t.login('camila')
    await t.rpc('transition_incident', { p_token: camila, p_code: 'ER-2026-0002', p_action: 'start', p_observation: 'Inicio' })
    await t.rpc('resolve_incident', {
      p_token: camila, p_code: 'ER-2026-0002',
      p_data: { summary: 'S', actionsTaken: 'A', result: 'R', observations: '', resolutionDate: '2026-10-01' },
    })
    await t.rpc('close_incident', { p_token: orientador, p_code: 'ER-2026-0002', p_observations: '', p_confirm: true })
    // Camila registró y atendió: su propia incidencia no se encuesta
    const own = await t.rpc('get_incident', { p_token: camila, p_code: 'ER-2026-0002' })
    expect(own.survey).toEqual({ status: 'No aplica', response: null })
    expect(own.allowedActions).not.toContain('survey')
  })

  it('CP-ENC-06: una baja satisfacción alerta a Orientación y Administración (acción de control)', async () => {
    await submit(bruno, { rating: 2, resolved: 'Parcialmente', speedRating: 3, comment: '' })
    const notes = await t.rpc('list_notifications', { p_token: orientador })
    expect(notes.items[0]).toMatchObject({ title: 'Atención con baja satisfacción', incidentCode: 'ER-2026-0004' })
    const audit = await t.rpc('list_audit', { p_token: admin })
    expect(audit[0]).toMatchObject({ action: 'Respuesta de encuesta', entityId: 'ER-2026-0004' })
  })

  it('CP-ENC-07: una buena evaluación no genera alertas', async () => {
    const before = (await t.rpc('list_notifications', { p_token: orientador })).items.length
    await submit(bruno)
    expect((await t.rpc('list_notifications', { p_token: orientador })).items.length).toBe(before)
  })

  it('CP-ENC-08: al reabrir y volver a cerrar se habilita una nueva encuesta para el nuevo cierre', async () => {
    await submit(bruno)
    await t.rpc('transition_incident', { p_token: admin, p_code: 'ER-2026-0004', p_action: 'reopen', p_reason: 'Nuevo pedido' })
    let detail = await t.rpc('get_incident', { p_token: bruno, p_code: 'ER-2026-0004' })
    expect(detail.survey).toBeNull()
    await t.rpc('transition_incident', {
      p_token: admin, p_code: 'ER-2026-0004', p_action: 'assign', p_observation: 'x', p_responsible: USER_ID.fabian,
    })
    await t.rpc('transition_incident', { p_token: admin, p_code: 'ER-2026-0004', p_action: 'start', p_observation: 'x' })
    await t.rpc('resolve_incident', {
      p_token: admin, p_code: 'ER-2026-0004',
      p_data: { summary: 'S', actionsTaken: 'A', result: 'R', observations: '', resolutionDate: '2026-10-05' },
    })
    await t.rpc('close_incident', { p_token: orientador, p_code: 'ER-2026-0004', p_observations: '', p_confirm: true })
    detail = await t.rpc('get_incident', { p_token: bruno, p_code: 'ER-2026-0004' })
    expect(detail.survey.status).toBe('Pendiente')
    await submit(bruno, { ...answer, rating: 5 })
    const { rows } = await t.db.query<{ n: number }>("select count(*)::int n from app.surveys where incident_code = 'ER-2026-0004'")
    expect(rows[0].n).toBe(2)
  })

  it('CP-ENC-09: el aviso de cierre invita a evaluar la atención', async () => {
    const alicia = await t.login('alicia')
    const { code } = await t.rpc('create_incident', { p_token: alicia, p_data: validIncident })
    for (const [action, extra] of [
      ['review', {}], ['assign', { p_responsible: USER_ID.camila }],
    ] as const) {
      await t.rpc('transition_incident', { p_token: orientador, p_code: code, p_action: action, p_observation: 'x', ...extra })
    }
    const camila = await t.login('camila')
    await t.rpc('transition_incident', { p_token: camila, p_code: code, p_action: 'start', p_observation: 'x' })
    await t.rpc('resolve_incident', {
      p_token: camila, p_code: code,
      p_data: { summary: 'S', actionsTaken: 'A', result: 'R', observations: '', resolutionDate: '2026-10-05' },
    })
    await t.rpc('close_incident', { p_token: orientador, p_code: code, p_observations: '', p_confirm: true })
    const notes = await t.rpc('list_notifications', { p_token: alicia })
    expect(notes.items[0].title).toBe('Tu incidencia fue cerrada: revisa el acta y cuéntanos cómo fue la atención')
  })
})
