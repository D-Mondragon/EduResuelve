import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { login, logout, USERS } from './helpers'

test.describe('Reportes', () => {
  test('E2E-REP-01: el reporte de incidencias filtra y abre el acta en una pestaña nueva', async ({ page, context }) => {
    await login(page, USERS.orientador.dni)
    await page.getByRole('link', { name: 'Reportes' }).first().click()
    await expect(page).toHaveURL(/\/reportes$/)
    await page.getByRole('button', { name: 'Todo' }).click()
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

    // El ojo abre el acta vigente sin salir del reporte
    const [acta] = await Promise.all([
      context.waitForEvent('page'),
      table.getByRole('link', { name: /Ver acta definitiva ACT-2026-0004-02/ }).click(),
    ])
    await expect(acta).toHaveURL(/\/incidencias\/ER-2026-0004\/acta\/ACT-2026-0004-02$/)
    await expect(acta.getByRole('article')).toContainText('ACTA DE RESOLUCIÓN')
    await acta.close()
    await expect(page).toHaveURL(/\/reportes$/)

    await page.getByRole('button', { name: 'Limpiar' }).click()
    await expect(table.getByRole('row')).toHaveCount(total)
    await expect(table.getByRole('row', { name: /ER-2026-0003/ })).toContainText('—') // abierta: sin acta
  })

  test('E2E-REP-02: las vistas predefinidas calculan por mes, responsable, categoría y pendientes', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/reportes')
    await page.getByRole('button', { name: 'Todo' }).click()

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
