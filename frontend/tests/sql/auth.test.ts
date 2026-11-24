import { beforeEach, describe, expect, it } from 'vitest'
import { DNI, setupDb, type TestDb } from './helpers'

describe('Autenticación por DNI (backend SQL)', () => {
  let t: TestDb
  beforeEach(async () => {
    t = await setupDb()
  })

  it('CP-AUTH-01: inicia sesión con DNI y contraseña válidos', async () => {
    const result = await t.rpc('login', { p_dni: DNI.greta, p_password: 'EduResuelve2026' })
    expect(result.token).toMatch(/^[0-9a-f]{64}$/)
    expect(result.user).toMatchObject({ dni: DNI.greta, role: 'Administrador', fullName: 'Greta Demostración' })
    expect(result.user.password_hash).toBeUndefined()
  })

  it('CP-AUTH-02: contraseña incorrecta devuelve mensaje genérico y queda auditada', async () => {
    const result = await t.rpc('login', { p_dni: DNI.alicia, p_password: 'incorrecta1' })
    expect(result).toEqual({ error: 'DNI o contraseña incorrectos.' })
    const audit = await t.db.query<{ action: string }>(
      "select action from app.audit_logs where dni = $1 order by id desc limit 1", [DNI.alicia])
    expect(audit.rows[0].action).toBe('Intento fallido de inicio de sesión')
  })

  it('CP-AUTH-03: DNI inexistente devuelve el mismo mensaje genérico', async () => {
    const result = await t.rpc('login', { p_dni: '12345678', p_password: 'loquesea1' })
    expect(result).toEqual({ error: 'DNI o contraseña incorrectos.' })
  })

  it('CP-AUTH-04: bloquea la cuenta tras 5 intentos fallidos', async () => {
    for (let i = 0; i < 4; i++) {
      await t.rpc('login', { p_dni: DNI.bruno, p_password: 'mala12345' })
    }
    const fifth = await t.rpc('login', { p_dni: DNI.bruno, p_password: 'mala12345' })
    expect(fifth.error).toMatch(/bloqueada por 15 minutos/)
    const withCorrect = await t.rpc('login', { p_dni: DNI.bruno, p_password: 'EduResuelve2026' })
    expect(withCorrect.error).toMatch(/Cuenta bloqueada temporalmente/)
  })

  it('CP-AUTH-05: un usuario inactivo no puede iniciar sesión', async () => {
    const result = await t.rpc('login', { p_dni: DNI.hugo, p_password: 'EduResuelve2026' })
    expect(result.error).toMatch(/inactiva/)
  })

  it('CP-AUTH-06: rechaza DNI con formato inválido', async () => {
    await t.expectError(t.rpc('login', { p_dni: '123', p_password: 'x' }), 'P0001', 'DNI de 8 dígitos')
  })

  it('CP-AUTH-07: un token inválido es rechazado con 401', async () => {
    await t.expectError(t.rpc('me', { p_token: 'f'.repeat(64) }), 'PT401')
    await t.expectError(t.rpc('list_incidents', { p_token: '' }), 'PT401')
  })

  it('CP-AUTH-08: cerrar sesión invalida el token', async () => {
    const token = await t.login('camila')
    expect((await t.rpc('me', { p_token: token })).dni).toBe(DNI.camila)
    await t.rpc('logout', { p_token: token })
    await t.expectError(t.rpc('me', { p_token: token }), 'PT401')
  })

  it('CP-AUTH-09: cambio de contraseña valida la actual y la política', async () => {
    const token = await t.login('camila')
    await t.expectError(
      t.rpc('change_password', { p_token: token, p_current: 'otra12345', p_new: 'Nueva2026x' }),
      'P0001', 'actual no es correcta')
    await t.expectError(
      t.rpc('change_password', { p_token: token, p_current: 'EduResuelve2026', p_new: 'corta' }),
      'P0001', 'al menos 8 caracteres')
    await t.rpc('change_password', { p_token: token, p_current: 'EduResuelve2026', p_new: 'Nueva2026x' })
    expect((await t.rpc('login', { p_dni: DNI.camila, p_password: 'EduResuelve2026' })).error).toBeDefined()
    expect((await t.rpc('login', { p_dni: DNI.camila, p_password: 'Nueva2026x' })).token).toBeDefined()
  })

  it('CP-AUTH-10: las tablas no son accesibles directamente para el rol anónimo', async () => {
    const grants = await t.db.query<{ n: number }>(
      "select count(*)::int as n from information_schema.role_table_grants where table_schema = 'app' and grantee in ('anon','authenticated','PUBLIC')")
    expect(grants.rows[0].n).toBe(0)
  })

  // Computadoras compartidas (sala de cómputo): la sesión se cierra tras 35 min sin actividad
  async function idleMinutes(token: string, minutes: number) {
    await t.db.query(
      "update app.sessions set last_seen_at = now() - make_interval(mins => $2) where token_hash = app.hash_token($1)", [token, minutes])
  }
  async function lastSeen(token: string) {
    const r = await t.db.query<{ s: number }>(
      "select extract(epoch from now() - last_seen_at)::int as s from app.sessions where token_hash = app.hash_token($1)", [token])
    return r.rows[0]?.s
  }

  it('CP-AUTH-11: una sesión sin actividad por más de 35 minutos se rechaza con un mensaje claro', async () => {
    const token = await t.login('alicia')
    await idleMinutes(token, 34)
    expect((await t.rpc('me', { p_token: token })).dni).toBe(DNI.alicia)
    await idleMinutes(token, 36)
    await t.expectError(t.rpc('me', { p_token: token }), 'PT401', 'inactividad')
    await t.expectError(t.rpc('list_incidents', { p_token: token }), 'PT401', 'inactividad')
  })

  it('CP-AUTH-12: la campana y las mediciones automáticas no mantienen viva la sesión; una acción del usuario sí', async () => {
    const token = await t.login('alicia')
    await idleMinutes(token, 20)
    await t.rpc('list_notifications', { p_token: token })
    await t.rpc('log_perf', { p_token: token, p_samples: [] })
    expect(await lastSeen(token)).toBeGreaterThanOrEqual(20 * 60 - 5)
    await t.rpc('list_incidents', { p_token: token })
    expect(await lastSeen(token)).toBeLessThan(5)
  })

  it('CP-AUTH-13: al iniciar sesión se eliminan las sesiones inactivas', async () => {
    const old = await t.login('alicia')
    await idleMinutes(old, 40)
    await t.login('bruno')
    expect(await lastSeen(old)).toBeUndefined()
  })
})
