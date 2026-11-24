import { expect, test } from './fixtures'
import { login, logout, USERS } from './helpers'

test.describe('Panel de calidad', () => {
  test('E2E-CAL-01: muestra los 4 indicadores con su meta y las tablas de detalle', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.getByRole('link', { name: 'Calidad' }).first().click()
    await expect(page).toHaveURL(/\/calidad$/)
    await expect(page.getByRole('heading', { name: 'Panel de calidad' })).toBeVisible()

    const kpis = page.getByRole('region', { name: 'Indicadores principales' })
    for (const label of ['Oportunidad', 'Satisfacción (CSAT)', 'Rendimiento', 'Calidad de datos']) {
      await expect(kpis.getByText(label, { exact: true })).toBeVisible()
    }
    await expect(kpis.getByText(/Meta: ≥ 80 %/).first()).toBeVisible()

    // Tiempos por prioridad: 4 filas con su meta; ER-2026-0003 (Crítica) aparece vencida y enlaza al caso
    const resolution = page.getByRole('region', { name: 'Tiempos de resolución por prioridad' })
    await expect(resolution.getByRole('row')).toHaveCount(5)
    await expect(resolution.getByRole('row', { name: /Crítica/ })).toContainText('≤ 24 h')
    await resolution.getByRole('link', { name: 'ER-2026-0003' }).click()
    await expect(page).toHaveURL(/\/incidencias\/ER-2026-0003$/)
    await page.goBack()

    // Calidad de datos: controles con estado en texto (no solo color)
    const data = page.getByRole('region', { name: 'Calidad de los datos' })
    await expect(data.getByRole('row', { name: /sin acta vigente/ })).toContainText('Correcto')
    await expect(data.getByRole('row', { name: /sin movimiento/ })).toContainText('Revisar')
  })

  test('E2E-CAL-04: Actualizar recalcula los indicadores y avisa el resultado, también si falla', async ({ page, browser }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/calidad')
    const summary = page.getByText(/^Calculado el .* sobre \d+ incidencias/)
    await expect(summary).toBeVisible()
    const total = async () => Number((await summary.innerText()).match(/sobre (\d+) incidencias/)![1])
    const before = await total()

    // Un estudiante reporta en otra sesión: al actualizar, el panel lo cuenta sin recargar la página
    const other = await browser.newContext()
    const student = await other.newPage()
    await login(student, USERS.estudiante.dni)
    await student.goto('/incidencias/nueva')
    await student.getByLabel('Título').fill('Foco quemado en el pasillo E2E')
    await student.getByLabel('Descripción').fill('El foco del pasillo del segundo piso no enciende desde el lunes.')
    await student.getByLabel('Categoría').selectOption('Infraestructura')
    await student.getByLabel('Prioridad').selectOption('Baja')
    await student.getByLabel('Fecha del incidente').fill('2026-10-20')
    await student.getByLabel('Lugar').fill('Pasillo del segundo piso')
    await student.getByRole('button', { name: 'Registrar incidencia' }).click()
    await expect(student).toHaveURL(/\/incidencias\/ER-\d{4}-\d{4}$/)
    await other.close()

    await page.getByRole('button', { name: 'Actualizar' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Indicadores actualizados.' })).toBeVisible()
    expect(await total()).toBeGreaterThan(before)

    // Error del servidor: se mantiene lo visible y se avisa
    await page.route(/quality_stats/, (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"fallo simulado"}' }))
    await page.getByRole('button', { name: 'Actualizar' }).click()
    await expect(page.getByRole('alert').filter({ hasText: /No se pudieron actualizar los indicadores/ })).toBeVisible()
    await expect(summary).toBeVisible()
  })

  test('E2E-CAL-02: el periodo de rendimiento se puede cambiar', async ({ page }) => {
    await login(page, USERS.orientador.dni)
    await page.goto('/calidad')
    const perf = page.getByRole('region', { name: 'Tiempos de respuesta del sistema' })
    await expect(perf.getByRole('button', { name: '30 días' })).toHaveAttribute('aria-pressed', 'true')
    await perf.getByRole('button', { name: '7 días' }).click()
    await expect(perf.getByRole('button', { name: '7 días' })).toHaveAttribute('aria-pressed', 'true')
    await expect(perf.getByText(/Mediciones|Aún no hay mediciones/).first()).toBeVisible()
  })

  test('E2E-CAL-03: docentes y estudiantes no ven el panel', async ({ page }) => {
    for (const who of [USERS.docente, USERS.estudiante]) {
      await login(page, who.dni)
      await expect(page.getByRole('link', { name: 'Calidad' })).toHaveCount(0)
      await page.goto('/calidad')
      await expect(page.getByText('Acceso restringido')).toBeVisible()
      await logout(page)
    }
  })
})
