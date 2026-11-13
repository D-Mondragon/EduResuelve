import { expect, test, type Page } from './fixtures'
import { login, USERS } from './helpers'

/**
 * Los reportes impresos ("Guardar como PDF") no deben desbordar la hoja.
 * Se simula el ancho útil de una hoja A4 (vertical: 182 mm ≈ 688 px; horizontal: 273 mm ≈ 1032 px).
 */
const A4_VERTICAL = 688
const A4_HORIZONTAL = 1032

async function expectFitsPrintedPage(page: Page, width: number) {
  await page.setViewportSize({ width, height: 1000 })
  await page.emulateMedia({ media: 'print' })
  const overflow = await page.evaluate(() => {
    const limit = document.documentElement.clientWidth + 1
    const tables = [...document.querySelectorAll('table')]
      .filter((t) => t.getBoundingClientRect().width > 0)
      .map((t) => Math.round(t.getBoundingClientRect().right))
    return { page: document.documentElement.scrollWidth, limit, tablesOutside: tables.filter((r) => r > limit) }
  })
  expect(overflow.tablesOutside, `tablas fuera de la hoja (límite ${overflow.limit}px)`).toEqual([])
  expect(overflow.page).toBeLessThanOrEqual(overflow.limit)
  await page.emulateMedia({ media: 'screen' })
}

test.describe('Impresión de reportes (PDF)', () => {
  test('E2E-PRINT-01: el panel de calidad cabe en una hoja A4 vertical', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/calidad')
    await page.getByRole('region', { name: 'Calidad de los datos' }).waitFor()
    await expectFitsPrintedPage(page, A4_VERTICAL)
  })

  test('E2E-PRINT-02: la auditoría se imprime en horizontal y su tabla cabe completa', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/auditoria')
    await expect(page.getByRole('table')).toBeVisible()
    // La página de Auditoría usa la hoja horizontal (CSS @page)
    expect(await page.locator('.print-landscape').count()).toBe(1)
    await expectFitsPrintedPage(page, A4_HORIZONTAL)
    await page.emulateMedia({ media: 'print' })
    await expect(page.getByRole('columnheader', { name: 'Descripción' })).toBeVisible()
  })

  test('E2E-PRINT-04: los reportes se imprimen en horizontal y caben en la hoja', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/reportes')
    await page.getByRole('button', { name: 'Todo' }).click()
    await expect(page).toHaveURL(/periodo=todo/)
    await expect(page.getByText('Preparando el reporte…')).toHaveCount(0)
    await expect(page.getByRole('table', { name: 'Reporte de incidencias' })).toBeVisible()
    expect(await page.locator('.print-landscape').count()).toBe(1)
    await expectFitsPrintedPage(page, A4_HORIZONTAL)
  })

  test('E2E-PRINT-03: el acta cabe en una hoja A4 vertical', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/incidencias/ER-2026-0004/acta/ACT-2026-0004-02')
    await page.getByRole('article').waitFor()
    await expectFitsPrintedPage(page, A4_VERTICAL)
  })
})
