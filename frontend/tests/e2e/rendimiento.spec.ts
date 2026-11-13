import { expect, test } from './fixtures'
import { login, logout, PASSWORD, USERS } from './helpers'

const API = 'http://localhost:54330/rest/v1/rpc'

test.describe('Tiempos de respuesta (RNF-001)', () => {
  test('E2E-PERF-01: el navegador mide cada operación y la envía de forma anónima; las estadísticas la reflejan', async ({ page, request }) => {
    type Batch = { p_samples: Array<{ fn: string; ms: number; ok: boolean; device: string }> }
    const sent: Batch[] = []
    page.on('request', (req) => {
      if (req.url().endsWith('/rpc/log_perf')) sent.push(req.postDataJSON() as Batch)
    })

    // Navegación como la de una persona: con clics dentro de la aplicación
    await login(page, USERS.estudiante.dni)
    await page.getByRole('link', { name: 'Mis incidencias' }).first().click()
    await page.getByRole('link', { name: /Conflicto durante el recreo/ }).first().click()
    await expect(page.getByRole('heading', { name: 'Conflicto durante el recreo' })).toBeVisible()
    await logout(page) // al cerrar sesión se envían las mediciones pendientes

    await expect.poll(() => sent.length).toBeGreaterThan(0)
    const samples = sent.flatMap((batch) => batch.p_samples)
    expect(samples.map((x) => x.fn)).toEqual(
      expect.arrayContaining(['carga_pagina', 'login', 'list_incidents', 'get_incident']),
    )
    expect(samples.every((x) => Number.isInteger(x.ms) && x.ms >= 0 && x.ok && x.device === 'Escritorio')).toBe(true)
    expect(JSON.stringify(sent)).not.toContain(USERS.estudiante.dni) // anónimo

    // El servidor las guardó y las estadísticas (Orientación/Administración) las incluyen
    const auth = await request.post(`${API}/login`, { data: { p_dni: USERS.admin.dni, p_password: PASSWORD } })
    const { token } = await auth.json()
    const stats = await (await request.post(`${API}/perf_stats`, { data: { p_token: token, p_days: 1 } })).json()
    expect(stats.overall.count).toBeGreaterThanOrEqual(samples.length)
    expect(stats.byOperation.map((o: { operation: string }) => o.operation)).toEqual(
      expect.arrayContaining(['login', 'list_incidents', 'get_incident', 'carga_pagina']),
    )
    expect(stats.overall.p95Ms).toBeLessThan(stats.thresholdMs)
  })
})
