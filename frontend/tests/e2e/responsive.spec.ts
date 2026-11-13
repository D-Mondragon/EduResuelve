import { expect, test } from './fixtures'
import { expectNoHorizontalScroll, login, USERS } from './helpers'

test.describe('Diseño responsive (móvil)', () => {
  test('E2E-RESP-01: el login no tiene desplazamiento horizontal', async ({ page }) => {
    await page.goto('/login')
    await expectNoHorizontalScroll(page)
  })

  test('E2E-RESP-02: menú móvil y todas las secciones sin desplazamiento horizontal', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.getByRole('button', { name: 'Abrir menú' }).click()
    const drawer = page.getByRole('dialog', { name: 'Menú' })
    await drawer.getByRole('link', { name: 'Usuarios' }).click()
    await expect(page).toHaveURL(/\/usuarios$/)
    await expect(drawer).toBeHidden()

    for (const path of [
      '/dashboard',
      '/incidencias',
      '/incidencias/nueva',
      '/incidencias/ER-2026-0003',
      '/incidencias/ER-2026-0001/seguimiento',
      '/incidencias/ER-2026-0003/evidencias',
      '/incidencias/ER-2026-0003/resolucion',
      '/incidencias/ER-2026-0005/cierre',
      '/usuarios',
      '/auditoria',
    ]) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await expectNoHorizontalScroll(page)
    }
  })

  test('E2E-RESP-03: en móvil el listado se muestra como tarjetas', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/incidencias')
    await expect(page.locator('table')).toBeHidden()
    await expect(page.getByRole('link', { name: /ER-2026-0001/ }).first()).toBeVisible()
  })
})
