import { beforeEach, describe, expect, it } from 'vitest'
import { DNI, PNG_BASE64, setupDb, USER_ID, type TestDb } from './helpers'

describe('Gestión de usuarios (solo Administrador)', () => {
  let t: TestDb
  let admin: string

  beforeEach(async () => {
    t = await setupDb()
    admin = await t.login('greta')
  })

  const newUser = {
    dni: '71234567', nombres: 'Nora', apellidos: 'Nueva', email: 'nora@example.com',
    role: 'Docente', password: 'Temporal2026',
  }

  it('CP-USR-01: un rol distinto de Administrador no puede gestionar usuarios', async () => {
    const orientador = await t.login('estela')
    await t.expectError(t.rpc('list_users', { p_token: orientador }), 'PT403')
    await t.expectError(t.rpc('create_user', { p_token: orientador, p_data: newUser }), 'PT403')
  })

  it('CP-USR-02: crea un usuario que debe cambiar su contraseña al primer ingreso', async () => {
    const created = await t.rpc('create_user', { p_token: admin, p_data: newUser })
    expect(created).toMatchObject({ dni: '71234567', role: 'Docente', status: 'Activo', mustChangePassword: true })
    expect(created.code).toMatch(/^USR-\d{4}$/)
    const login = await t.rpc('login', { p_dni: '71234567', p_password: 'Temporal2026' })
    expect(login.user.mustChangePassword).toBe(true)
  })

  it('CP-USR-03: valida DNI duplicado, formato y contraseña débil', async () => {
    await t.expectError(t.rpc('create_user', { p_token: admin, p_data: { ...newUser, dni: DNI.alicia } }), 'P0001', 'Ya existe')
    await t.expectError(t.rpc('create_user', { p_token: admin, p_data: { ...newUser, dni: '1234' } }), 'P0001', '8 dígitos')
    await t.expectError(t.rpc('create_user', { p_token: admin, p_data: { ...newUser, email: 'x' } }), 'P0001', 'correo')
    await t.expectError(t.rpc('create_user', { p_token: admin, p_data: { ...newUser, password: '12345678' } }), 'P0001', 'letras y números')
    await t.expectError(
      t.rpc('create_user', { p_token: admin, p_data: { ...newUser, role: 'Responsable de convivencia' } }),
      'P0001', 'rol válido')
  })

  it('CP-USR-04: cambio de rol queda auditado', async () => {
    await t.rpc('update_user', {
      p_token: admin, p_id: USER_ID.camila,
      p_data: { dni: DNI.camila, nombres: 'Camila', apellidos: 'Ficticia', email: 'camila.ficticia@example.com', role: 'Orientador' },
    })
    const audit = await t.rpc('list_audit', { p_token: admin })
    expect(audit[1]).toMatchObject({ action: 'Cambio de rol', description: 'Camila Ficticia: Docente → Orientador.' })
  })

  it('CP-USR-05: protege al último Administrador activo y a la propia cuenta', async () => {
    await t.expectError(
      t.rpc('set_user_status', { p_token: admin, p_id: USER_ID.greta, p_status: 'Inactivo' }), 'P0001', 'propia cuenta')
    await t.expectError(
      t.rpc('update_user', {
        p_token: admin, p_id: USER_ID.greta,
        p_data: { dni: DNI.greta, nombres: 'Greta', apellidos: 'Demostración', email: 'greta@example.com', role: 'Docente' },
      }), 'P0001', 'propio rol')
  })

  it('C4: desactivar a un responsable deja sus casos pendientes de reasignación y cierra su sesión', async () => {
    const docente = await t.login('camila')
    // Camila es responsable de ER-2026-0002 (Asignado)
    const result = await t.rpc('set_user_status', { p_token: admin, p_id: USER_ID.camila, p_status: 'Inactivo' })
    expect(result.pendingReassignments).toBe(1)
    await t.expectError(t.rpc('me', { p_token: docente }), 'PT401')

    const orientador = await t.login('estela')
    const detail = await t.rpc('get_incident', { p_token: orientador, p_code: 'ER-2026-0002' })
    expect(detail.pendingReassignment).toBe(true)
    expect(detail.allowedActions).toContain('reassign')
    const notifications = await t.rpc('list_notifications', { p_token: orientador })
    expect(notifications.items[0].title).toBe('Incidencia pendiente de reasignación')

    await t.expectError(
      t.rpc('reassign_incident', { p_token: orientador, p_code: 'ER-2026-0002', p_responsible: USER_ID.fabian, p_reason: '' }),
      'P0001', 'motivo')
    await t.rpc('reassign_incident', {
      p_token: orientador, p_code: 'ER-2026-0002', p_responsible: USER_ID.fabian, p_reason: 'Docente desactivada',
    })
    const after = await t.rpc('get_incident', { p_token: orientador, p_code: 'ER-2026-0002' })
    expect(after.pendingReassignment).toBe(false)
    expect(after.responsible.id).toBe(USER_ID.fabian)
    expect(after.followUps.at(-1)).toMatchObject({ kind: 'Reasignación', reason: 'Docente desactivada' })
  })

  it('C4: no se puede reasignar una incidencia que no está pendiente', async () => {
    const orientador = await t.login('estela')
    await t.expectError(
      t.rpc('reassign_incident', { p_token: orientador, p_code: 'ER-2026-0002', p_responsible: USER_ID.fabian, p_reason: 'x' }),
      'PT403')
  })

  it('CP-USR-06: restablecer contraseña desbloquea y obliga a cambiarla', async () => {
    for (let i = 0; i < 5; i++) await t.rpc('login', { p_dni: DNI.bruno, p_password: 'mala12345' })
    await t.rpc('reset_user_password', { p_token: admin, p_id: USER_ID.bruno, p_new_password: 'Reinicio2026' })
    const login = await t.rpc('login', { p_dni: DNI.bruno, p_password: 'Reinicio2026' })
    expect(login.user.mustChangePassword).toBe(true)
  })
})

describe('Evidencias', () => {
  let t: TestDb
  let admin: string

  beforeEach(async () => {
    t = await setupDb()
    admin = await t.login('greta')
  })

  const meta = {
    fileName: 'foto.png', mimeType: 'image/png', sizeBytes: 70, originalSizeBytes: 70,
    compressed: false, evidenceType: 'Imagen', description: 'Foto del aula',
  }

  async function upload(token: string, code: string, data = PNG_BASE64, m = meta) {
    const { id } = await t.rpc('evidence_begin', { p_token: token, p_code: code, p_meta: m })
    await t.rpc('evidence_chunk', { p_token: token, p_id: id, p_idx: 0, p_data: data })
    return { id: id as number, finish: () => t.rpc('evidence_finish', { p_token: token, p_id: id }) }
  }

  it('CP-EVI-01: sube, lista y descarga una evidencia', async () => {
    const { id, finish } = await upload(admin, 'ER-2026-0003')
    await finish()
    const detail = await t.rpc('get_incident', { p_token: admin, p_code: 'ER-2026-0003' })
    expect(detail.evidences[0]).toMatchObject({ id, fileName: 'foto.png', status: 'Activa', chunkCount: 1 })
    const chunk = await t.rpc('evidence_chunk_get', { p_token: admin, p_id: id, p_idx: 0 })
    expect(chunk).toBe(PNG_BASE64)
  })

  it('CP-EVI-02: rechaza archivos cuyo contenido no coincide con el tipo', async () => {
    const fakePdf = Buffer.from('esto no es un pdf').toString('base64')
    const { finish } = await upload(admin, 'ER-2026-0003', fakePdf, { ...meta, fileName: 'x.pdf', mimeType: 'application/pdf' })
    await t.expectError(finish(), 'P0001', 'no coincide con su tipo')
  })

  it('CP-EVI-03: rechaza tipos no permitidos y archivos de más de 10 MB', async () => {
    await t.expectError(
      t.rpc('evidence_begin', { p_token: admin, p_code: 'ER-2026-0003', p_meta: { ...meta, mimeType: 'application/zip' } }),
      'P0001', 'no permitido')
    await t.expectError(
      t.rpc('evidence_begin', { p_token: admin, p_code: 'ER-2026-0003', p_meta: { ...meta, sizeBytes: 11 * 1024 * 1024 } }),
      'P0001', '10 MB')
  })

  it('E4: no se agregan evidencias a incidencias cerradas', async () => {
    await t.expectError(
      t.rpc('evidence_begin', { p_token: admin, p_code: 'ER-2026-0004', p_meta: meta }), 'PT403')
  })

  it('E2: máximo 10 evidencias activas por incidencia', async () => {
    for (let i = 0; i < 10; i++) await (await upload(admin, 'ER-2026-0003')).finish()
    await t.expectError(
      t.rpc('evidence_begin', { p_token: admin, p_code: 'ER-2026-0003', p_meta: meta }), 'P0001', 'máximo de 10')
  })

  it('E3 / RN-009: anular exige motivo y conserva el registro', async () => {
    const { id, finish } = await upload(admin, 'ER-2026-0003')
    await finish()
    await t.expectError(t.rpc('evidence_void', { p_token: admin, p_id: id, p_reason: '' }), 'P0001', 'motivo')
    await t.rpc('evidence_void', { p_token: admin, p_id: id, p_reason: 'Archivo equivocado' })
    const detail = await t.rpc('get_incident', { p_token: admin, p_code: 'ER-2026-0003' })
    expect(detail.evidences[0]).toMatchObject({ status: 'Anulada', voidReason: 'Archivo equivocado', canVoid: false })
  })

  it('CP-EVI-04: un estudiante no puede ver evidencias de incidencias ajenas', async () => {
    const { id, finish } = await upload(admin, 'ER-2026-0003')
    await finish()
    const student = await t.login('bruno')
    await t.expectError(t.rpc('evidence_chunk_get', { p_token: student, p_id: id, p_idx: 0 }), 'PT404')
  })
})
