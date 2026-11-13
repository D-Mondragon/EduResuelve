import { expect, test } from './fixtures'
import { readFileSync } from 'node:fs'
import { login, logout, USERS } from './helpers'
import type { Page } from './fixtures'

/** Elige el periodo "Todo" y espera a que el reporte termine de recargarse. */
async function chooseAll(page: Page) {
  await page.getByRole('button', { name: 'Todo' }).click()
  await expect(page).toHaveURL(/periodo=todo/)
  await expect(page.getByText('Preparando el reporte…')).toHaveCount(0)
}

test.describe('Reportes', () => {
  test('E2E-REP-01: el reporte filtra, abre el acta y "Volver a Reportes" conserva los filtros', async ({ page }) => {
    await login(page, USERS.orientador.dni)
    await page.getByRole('link', { name: 'Reportes' }).first().click()
    await expect(page).toHaveURL(/\/reportes$/)
    await chooseAll(page)
    const table = page.getByRole('table', { name: 'Reporte de incidencias' })
    await expect(table).toContainText('ER-2026-0004')
    const total = await table.getByRole('row').count()
    expect(total).toBeGreaterThan(5) // encabezado + al menos las 5 incidencias demo

    // Filtro por estado: todas las filas que quedan están cerradas
    await page.getByLabel('Estado').selectOption('Cerrado')
    await expect(table.getByRole('row')).not.toHaveCount(total)
    const statuses = await table.locator('tbody tr td:nth-child(4)').allInnerTexts()
    expect(statuses.length).toBeGreaterThan(0)
    expect(statuses.every((t) => t.includes('Cerrado'))).toBe(true)
    await expect(table).toContainText('ER-2026-0004')

    // El ojo abre el acta vigente…
    await table.getByRole('link', { name: /Ver acta definitiva ACT-2026-0004-02/ }).click()
    await expect(page).toHaveURL(/\/incidencias\/ER-2026-0004\/acta\/ACT-2026-0004-02\?volver=/)
    await expect(page.getByRole('article')).toContainText('ACTA DE RESOLUCIÓN')
    await expect(page.getByRole('link', { name: 'Ver incidencia ER-2026-0004' })).toBeVisible()

    // …y "Volver a Reportes" regresa al reporte con el periodo y el filtro aplicados
    await page.getByRole('link', { name: 'Volver a Reportes' }).click()
    await expect(page).toHaveURL(/\/reportes\?.*periodo=todo/)
    await expect(page).toHaveURL(/estado=Cerrado/)
    await expect(page.getByLabel('Estado')).toHaveValue('Cerrado')
    await expect(page.getByRole('button', { name: 'Todo' })).toHaveAttribute('aria-pressed', 'true')
    await expect(table).toContainText('ER-2026-0004')

    // Sin ?volver, el acta sigue regresando a su incidencia; un ?volver externo se ignora
    await page.goto('/incidencias/ER-2026-0004/acta/ACT-2026-0004-02?volver=https%3A%2F%2Fejemplo.com')
    await expect(page.getByRole('link', { name: 'Volver a ER-2026-0004' })).toHaveAttribute('href', '/incidencias/ER-2026-0004')
    await page.goBack()

    await page.getByRole('button', { name: 'Limpiar' }).click()
    await expect(table.getByRole('row')).toHaveCount(total)
    await expect(table.getByRole('row', { name: /ER-2026-0003/ })).toContainText('—') // abierta: sin acta
  })

  test('E2E-REP-04: la paginación divide la tabla, conserva la página en la URL y el PDF incluye todas las filas', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/reportes?periodo=todo&tam=10')
    const table = page.getByRole('table', { name: 'Reporte de incidencias' })
    const pager = page.getByRole('navigation', { name: 'Paginación de incidencias' })
    await expect(pager).toContainText(/Mostrando 1–\d+ de \d+/)
    const [, shown, total] = (await pager.getByText(/Mostrando/).innerText()).match(/1–(\d+) de (\d+)/)!.map(Number)
    expect(shown).toBe(Math.min(10, total))
    await expect(table.locator('tbody tr:visible')).toHaveCount(shown)
    await expect(pager.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    await expect(page.getByLabel('Filas por página')).toHaveValue('10')

    if (total > 10) {
      await pager.getByRole('button', { name: 'Siguiente' }).click()
      await expect(page).toHaveURL(/pagina=2/)
      await expect(pager).toContainText(`Mostrando 11–${Math.min(20, total)} de ${total}`)
      await expect(pager.getByRole('button', { name: 'Anterior' })).toBeEnabled()
    }

    // Cambiar el tamaño vuelve a la página 1
    await page.getByLabel('Filas por página').selectOption('50')
    await expect(page).not.toHaveURL(/pagina=/)
    await expect(table.locator('tbody tr:visible')).toHaveCount(Math.min(50, total))

    // Al imprimir se muestran todas las filas, no solo la página actual
    await page.getByLabel('Filas por página').selectOption('10')
    await page.emulateMedia({ media: 'print' })
    await expect(table.locator('tbody tr:visible')).toHaveCount(total)
  })

  test('E2E-REP-02: las vistas predefinidas calculan por mes, responsable, categoría y pendientes', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/reportes')
    await chooseAll(page)

    await page.getByRole('tab', { name: 'Mensual' }).click()
    await expect(page.getByRole('table', { name: /mensual/ })).toContainText('Setiembre de 2026')

    // Navegación por teclado entre pestañas
    await page.getByRole('tab', { name: 'Mensual' }).press('ArrowRight')
    await expect(page.getByRole('tab', { name: 'Por responsable' })).toBeFocused()
    await expect(page.getByRole('tab', { name: 'Por responsable' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('table', { name: 'Reporte por responsable' })).toContainText('Fabián Imaginario')

    await page.getByRole('tab', { name: 'Por categoría y lugar' }).click()
    await expect(page.getByRole('table', { name: 'Reporte por categoría' }).getByRole('row')).toHaveCount(6)

    await page.getByRole('tab', { name: 'Pendientes y vencidas' }).click()
    const pendientes = page.getByRole('table', { name: /pendientes/ })
    await expect(pendientes).toContainText('ER-2026-0003') // abierta desde septiembre
    const pendingRows = await pendientes.getByRole('row').count()
    expect(pendingRows).toBeGreaterThanOrEqual(4) // encabezado + al menos las 3 abiertas demo
    await expect(pendientes.getByRole('row').nth(1)).toContainText('Vencida') // la más urgente primero

    // Exporta la vista actual a CSV
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar CSV' }).click()])
    expect(download.suggestedFilename()).toMatch(/^reporte-pendientes-/)
    const csv = readFileSync((await download.path())!, 'utf8')
    expect(csv).toContain('Código;Título;Prioridad;Estado;Responsable')
    expect(csv.split('\r\n')).toHaveLength(pendingRows) // encabezado + una línea por pendiente
  })

  test('E2E-REP-03: docentes y estudiantes no acceden a los reportes', async ({ page }) => {
    for (const who of [USERS.docente, USERS.estudiante]) {
      await login(page, who.dni)
      await expect(page.getByRole('link', { name: 'Reportes' })).toHaveCount(0)
      await page.goto('/reportes')
      await expect(page.getByText('Acceso restringido')).toBeVisible()
      await logout(page)
    }
  })
})
