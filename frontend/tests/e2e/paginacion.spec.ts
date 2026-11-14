import { expect, test } from './fixtures'
import { login, USERS } from './helpers'

/* Paginación compartida con Reportes: rango visible, filas por página y estado en la URL. */
test.describe('Paginación de listados', () => {
  test('E2E-PAG-01: Auditoría pagina, conserva la página en la URL y vuelve a la 1 al filtrar', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/auditoria')
    const nav = page.getByRole('navigation', { name: 'Paginación de eventos' })
    await nav.getByLabel('Filas por página').selectOption('10')
    await expect(page).toHaveURL(/tam=10/)
    await expect(nav).toContainText(/Mostrando 1–10 de \d+/)
    await expect(nav).toContainText('Página 1 de')

    await nav.getByRole('button', { name: 'Siguiente' }).click()
    await expect(page).toHaveURL(/pagina=2/)
    await expect(nav).toContainText(/Mostrando 11–\d+ de \d+/)
    await expect(nav.getByRole('button', { name: 'Anterior' })).toBeEnabled()

    // Al cambiar un filtro se vuelve a la primera página, pero se conservan las filas por página
    await page.getByLabel('Módulo').selectOption('Autenticación')
    await expect(page).not.toHaveURL(/pagina=/)
    await expect(page).toHaveURL(/tam=10/)
    await expect(nav).toContainText('Página 1 de')
  })

  test('E2E-PAG-02: Incidencias muestra el paginador y respeta las filas por página', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/incidencias?tam=10')
    const nav = page.getByRole('navigation', { name: 'Paginación de incidencias' })
    await expect(nav.getByLabel('Filas por página')).toHaveValue('10')
    await expect(nav).toContainText(/Mostrando 1–\d+ de \d+/)
    const visibleRows = page.locator('table tbody tr')
    expect(await visibleRows.count()).toBeLessThanOrEqual(10)
    // Una página inexistente en la URL se ajusta a la última disponible
    await page.goto('/incidencias?pagina=99')
    await expect(nav).toContainText(/Página (\d+) de \1/)
  })

  test('E2E-PAG-03: Usuarios muestra el paginador y el botón "Restablecer clave"', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/usuarios')
    await expect(page.getByRole('navigation', { name: 'Paginación de usuarios' })).toContainText(/Mostrando 1–\d+ de \d+/)
    await expect(page.getByRole('button', { name: /Restablecer clave de Bruno Muestra/ }).first()).toContainText('Restablecer clave')
  })
})
