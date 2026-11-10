import { expect, type Page } from '@playwright/test'

export const PASSWORD = 'EduResuelve2026'

export const USERS = {
  estudiante: { dni: '70000001', name: 'Alicia Ejemplo' },
  estudiante2: { dni: '70000002', name: 'Bruno Muestra' },
  docente: { dni: '70000003', name: 'Camila Ficticia' },
  orientador: { dni: '70000005', name: 'Estela Inventada' },
  orientador2: { dni: '70000006', name: 'Fabián Imaginario' },
  admin: { dni: '70000007', name: 'Greta Demostración' },
} as const

export async function login(page: Page, dni: string, password = PASSWORD) {
  await page.goto('/login')
  await page.getByLabel('DNI').fill(dni)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

export async function logout(page: Page) {
  await page.locator('header button[aria-haspopup="true"]').last().click()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page).toHaveURL(/\/login$/)
}

/** Registra una incidencia como el usuario actual y devuelve su código. */
export async function createIncident(page: Page, title: string, priority = 'Media') {
  await page.goto('/incidencias/nueva')
  await page.getByLabel('Título').fill(title)
  await page.getByLabel('Descripción').fill(`Descripción de prueba para ${title}.`)
  await page.getByLabel('Categoría').selectOption('Convivencia')
  await page.getByLabel('Prioridad').selectOption(priority)
  await page.getByLabel('Fecha del incidente').fill('2026-10-15')
  await page.getByLabel('Lugar').fill('Aula 3')
  await page.getByRole('button', { name: 'Registrar incidencia' }).click()
  await expect(page).toHaveURL(/\/incidencias\/ER-\d{4}-\d{4}$/)
  const code = page.url().split('/').pop()!
  return code
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
}
