import { expect, test } from '@playwright/test'
import { login, logout, USERS } from './helpers'

// ER-2026-0004 (datos demo) está Cerrada: la registró Bruno, la atendió Fabián y la cerró Estela.
test.describe('Encuesta de satisfacción (RN-012)', () => {
  test('E2E-ENC-01: el registrante ve el aviso, valida y envía la encuesta (incluso con teclado)', async ({ page }) => {
    await login(page, USERS.estudiante2.dni)
    const banner = page.getByRole('region', { name: 'Encuestas pendientes' })
    await expect(banner).toContainText('Tienes 1 encuesta pendiente')
    await banner.getByRole('link', { name: 'Evaluar la atención' }).click()
    await expect(page).toHaveURL(/\/incidencias\/ER-2026-0004\/encuesta$/)

    await page.getByRole('button', { name: 'Enviar evaluación' }).click()
    await expect(page.getByText('Califica tu satisfacción general.')).toBeVisible()
    await expect(page.getByText('Indica si se resolvió tu problema.')).toBeVisible()
    await expect(page.getByText('Califica la rapidez de la atención.')).toBeVisible()

    // Satisfacción con teclado: foco en la 1.ª estrella y flechas
    await page.getByLabel('1 de 5: Muy insatisfecho').focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByLabel('2 de 5: Insatisfecho')).toBeChecked()
    await expect(page.getByText('Insatisfecho', { exact: true })).toBeVisible()

    await page.getByText('Parcialmente', { exact: true }).click()
    // Rapidez con el mouse: clic en la 3.ª estrella
    await page.locator('label', { has: page.getByLabel('3 de 5: Aceptable') }).click()
    await expect(page.getByLabel('3 de 5: Aceptable')).toBeChecked()
    await page.getByLabel('Comentario').fill('Tardaron en responder a la familia.')
    await page.getByRole('button', { name: 'Enviar evaluación' }).click()
    await expect(page.getByText('¡Gracias! Tu opinión nos ayuda a mejorar la atención.')).toBeVisible()

    await expect(page).toHaveURL(/\/incidencias\/ER-2026-0004$/)
    const card = page.getByRole('region', { name: 'Satisfacción con la atención' })
    await expect(card).toContainText('2/5 · Insatisfecho')
    await expect(card).toContainText('Parcialmente')
    await expect(page.getByText('Siguiente paso')).toHaveCount(0)

    await page.goto('/dashboard')
    await expect(page.getByRole('region', { name: 'Encuestas pendientes' })).toHaveCount(0)
  })

  test('E2E-ENC-02: una baja satisfacción alerta a Orientación, que ve la respuesta', async ({ page }) => {
    await login(page, USERS.orientador.dni)
    await page.getByRole('button', { name: /Notificaciones: \d+ sin leer/ }).click()
    await page.getByRole('button', { name: /Atención con baja satisfacción/ }).first().click()
    await expect(page).toHaveURL(/\/incidencias\/ER-2026-0004$/)
    const card = page.getByRole('region', { name: 'Satisfacción con la atención' })
    await expect(card).toContainText('Respondida por Bruno Muestra')
    await expect(card).toContainText('Tardaron en responder a la familia.')
    await expect(page.getByRole('link', { name: 'Evaluar la atención' })).toHaveCount(0)
    await logout(page)
  })

  test('E2E-ENC-03: no se puede responder dos veces ni entrar a la encuesta de otro', async ({ page }) => {
    await login(page, USERS.estudiante2.dni)
    await page.goto('/incidencias/ER-2026-0004/encuesta')
    await expect(page.getByText('Encuesta respondida')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enviar evaluación' })).toHaveCount(0)
    await logout(page)

    await login(page, USERS.admin.dni)
    await page.goto('/incidencias/ER-2026-0004/encuesta')
    await expect(page.getByText('Encuesta respondida')).toBeVisible()
  })
})
