import { expect, test } from '@playwright/test'
import { login, logout, USERS } from './helpers'

test.describe('Login y sesión', () => {
  test('E2E-AUTH-01: valida el formato del DNI antes de enviar', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('DNI').fill('123')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByText('El DNI debe tener 8 dígitos.')).toBeVisible()
    await expect(page.getByText('Ingresa tu contraseña.')).toBeVisible()
  })

  test('E2E-AUTH-02: el campo DNI solo acepta dígitos', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('DNI').fill('7a0b0c0d0e0f0g1h9')
    await expect(page.getByLabel('DNI')).toHaveValue('70000001')
  })

  test('E2E-AUTH-03: credenciales incorrectas muestran un mensaje genérico', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('DNI').fill(USERS.estudiante2.dni)
    await page.getByLabel('Contraseña', { exact: true }).fill('incorrecta123')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByRole('alert')).toHaveText('DNI o contraseña incorrectos.')
    await expect(page.getByLabel('Contraseña', { exact: true })).toHaveValue('')
  })

  test('E2E-AUTH-04: login correcto, sesión persistente al recargar y cierre de sesión', async ({ page }) => {
    await login(page, USERS.docente.dni)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Camila')
    await page.reload()
    await expect(page).toHaveURL(/\/dashboard$/)
    await logout(page)
    await page.goto('/incidencias')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('E2E-AUTH-05: una ruta protegida redirige al login y luego vuelve', async ({ page }) => {
    await page.goto('/incidencias/ER-2026-0001')
    await expect(page).toHaveURL(/\/login$/)
    await page.getByLabel('DNI').fill(USERS.admin.dni)
    await page.getByLabel('Contraseña', { exact: true }).fill('EduResuelve2026')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page).toHaveURL(/\/incidencias\/ER-2026-0001$/)
  })

  test('E2E-AUTH-06: un usuario inactivo no puede ingresar', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('DNI').fill('70000008')
    await page.getByLabel('Contraseña', { exact: true }).fill('EduResuelve2026')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByRole('alert')).toContainText('inactiva')
  })

  test('E2E-AUTH-07: el menú se adapta al rol (RN-010)', async ({ page }) => {
    await login(page, USERS.estudiante.dni)
    const nav = page.getByRole('navigation', { name: 'Navegación principal' })
    await expect(nav.getByRole('link', { name: 'Mis incidencias' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Usuarios' })).toHaveCount(0)
    await expect(nav.getByRole('link', { name: 'Auditoría' })).toHaveCount(0)
    await page.goto('/usuarios')
    await expect(page.getByText('Acceso restringido')).toBeVisible()
  })

  test('E2E-AUTH-08: tema oscuro se aplica y se recuerda', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('radio', { name: 'Oscuro' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.getByRole('radio', { name: 'Claro' }).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('E2E-AUTH-09: página 404 para rutas inexistentes', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/esto-no-existe')
    await expect(page.getByText('Página no encontrada')).toBeVisible()
  })
})
