import { expect, test } from './fixtures'
import { createIncident, login, logout, USERS } from './helpers'

test.describe.serial('Flujo completo de una incidencia', () => {
  let code = ''

  test('E2E-INC-01: el formulario valida campos obligatorios', async ({ page }) => {
    await login(page, USERS.estudiante.dni)
    await page.goto('/incidencias/nueva')
    await page.getByRole('button', { name: 'Registrar incidencia' }).click()
    await expect(page.getByText('Ingresa un título que resuma lo ocurrido.')).toBeVisible()
    await expect(page.getByText('Selecciona una categoría.')).toBeVisible()
    await expect(page.getByLabel('Título')).toBeFocused()
  })

  test('E2E-INC-02: un estudiante registra una incidencia en estado Nuevo (RN-001)', async ({ page }) => {
    await login(page, USERS.estudiante.dni)
    code = await createIncident(page, 'Pelea en la cafetería E2E', 'Alta')
    await expect(page.getByText(`Incidencia ${code} registrada correctamente.`)).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pelea en la cafetería E2E')
    await expect(page.getByText('Nuevo').first()).toBeVisible()
    // El estudiante no tiene acciones de gestión
    await expect(page.getByText('Siguiente paso')).toHaveCount(0)
    await page.goto('/incidencias')
    await expect(page.getByText(code).first()).toBeVisible()
  })

  test('E2E-INC-03: quien registró puede editar mientras está en Nuevo (D3)', async ({ page }) => {
    await login(page, USERS.estudiante.dni)
    await page.goto(`/incidencias/${code}`)
    await page.getByRole('link', { name: 'Editar' }).click()
    await page.getByLabel('Lugar').fill('Cafetería principal')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Campos modificados: lugar.')).toBeVisible()
  })

  test('E2E-INC-04: el orientador revisa y asigna a una docente (RN-002/RN-004)', async ({ page }) => {
    await login(page, USERS.orientador.dni)
    await page.goto(`/incidencias/${code}`)
    await page.getByRole('link', { name: 'Iniciar revisión' }).click()
    await page.getByRole('button', { name: 'Iniciar revisión' }).click()
    await expect(page.getByText('Ingresa una observación para el seguimiento.')).toBeVisible()
    await page.getByLabel('Observación').fill('Se conversó con los estudiantes.')
    await page.getByRole('button', { name: 'Iniciar revisión' }).click()
    await expect(page.getByText('La incidencia pasó a "En revisión".')).toBeVisible()

    await page.getByRole('link', { name: 'Asignar responsable' }).click()
    await page.getByRole('button', { name: 'Asignar responsable' }).click()
    await expect(page.getByText('Selecciona un responsable.')).toBeVisible()
    const select = page.locator('select#responsible')
    // Solo usuarios elegibles: no aparecen estudiantes
    await expect(select.locator('option', { hasText: 'Estudiante' })).toHaveCount(0)
    await select.selectOption({ label: 'Camila Ficticia — Docente' })
    await page.getByLabel('Observación').fill('Asignado a tutoría.')
    await page.getByRole('button', { name: 'Asignar responsable' }).click()
    await expect(page.getByText('La incidencia pasó a "Asignado".')).toBeVisible()
    await expect(page.getByText('Responsable: Camila Ficticia (Docente)')).toBeVisible()
  })

  test('E2E-INC-05: la docente recibe la notificación, atiende y resuelve (RN-005)', async ({ page }) => {
    await login(page, USERS.docente.dni)
    const bell = page.getByRole('button', { name: /Notificaciones: \d+ sin leer/ })
    await expect(bell).toBeVisible()
    await bell.click()
    await page.getByRole('button', { name: /Se te asignó una incidencia/ }).first().click()
    await expect(page).toHaveURL(new RegExp(`/incidencias/${code}$`))

    await page.getByRole('link', { name: 'Iniciar atención' }).click()
    await page.getByLabel('Observación').fill('Inicio de acompañamiento.')
    await page.getByRole('button', { name: 'Iniciar atención' }).click()
    await expect(page.getByText('La incidencia pasó a "En atención".')).toBeVisible()

    await page.getByRole('link', { name: 'Registrar resolución' }).click()
    await page.getByRole('button', { name: 'Registrar resolución' }).click()
    await expect(page.getByText('Ingresa un resumen de la resolución.')).toBeVisible()
    await page.getByLabel('Resumen de la resolución').fill('Se mediaron las diferencias.')
    await page.getByLabel('Acciones realizadas').fill('Reunión con ambos estudiantes y sus familias.')
    await page.getByLabel('Resultado de la atención').fill('Acuerdo de convivencia firmado.')
    await page.getByRole('button', { name: 'Registrar resolución' }).click()
    await expect(page.getByText('Resolución registrada. La incidencia pasó a "Resuelto".')).toBeVisible()
    // La docente no puede cerrar
    await expect(page.getByText('Siguiente paso')).toHaveCount(0)
  })

  test('E2E-INC-06: el orientador cierra con confirmación (RN-006)', async ({ page }) => {
    await login(page, USERS.orientador.dni)
    await page.goto(`/incidencias/${code}/cierre`)
    await page.getByRole('button', { name: 'Cerrar incidencia' }).click()
    await expect(page.getByText('Confirma que la información es suficiente para cerrar.')).toBeVisible()
    await page.getByLabel(/Confirmo que revisé la resolución/).check()
    await page.getByRole('button', { name: 'Cerrar incidencia' }).click()
    await expect(page.getByText('Incidencia cerrada correctamente.')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Cierre' })).toBeVisible()
    // RN-011: el cierre emite el acta definitiva y la provisional queda como versión anterior
    const acta = page.getByRole('region', { name: 'Acta de resolución' })
    await expect(acta).toContainText('Definitiva')
    await expect(acta).toContainText('Versiones anteriores (1)')
  })

  test('E2E-INC-07: solo el administrador reabre, con motivo y confirmación (RN-008)', async ({ page }) => {
    await login(page, USERS.orientador.dni)
    await page.goto(`/incidencias/${code}/seguimiento`)
    await expect(page.getByText('Sin acciones disponibles')).toBeVisible()
    await logout(page)

    await login(page, USERS.admin.dni)
    await page.goto(`/incidencias/${code}/seguimiento?accion=reopen`)
    await page.getByRole('button', { name: 'Reabrir' }).click()
    await expect(page.getByText('Debe indicar el motivo de la reapertura.')).toBeVisible()
    await page.getByLabel('Motivo de la reapertura').fill('La familia reporta un nuevo episodio.')
    await page.getByRole('button', { name: 'Reabrir' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('La familia reporta un nuevo episodio.')
    await dialog.getByRole('button', { name: 'Sí, reabrir' }).click()
    await expect(page.getByText('La incidencia pasó a "En revisión".')).toBeVisible()
    await expect(page.getByText('Motivo: La familia reporta un nuevo episodio.')).toBeVisible()
  })

  test('E2E-INC-08: descartar exige motivo (RN-007)', async ({ page }) => {
    await login(page, USERS.orientador.dni)
    await page.goto(`/incidencias/${code}/seguimiento`)
    await page.getByText('Descartar', { exact: true }).click()
    await page.getByRole('button', { name: 'Descartar' }).click()
    await expect(page.getByText('Debe indicar el motivo del descarte.')).toBeVisible()
    await page.getByLabel('Motivo del descarte').fill('Caso duplicado de otra incidencia.')
    await page.getByRole('button', { name: 'Descartar' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Sí, descartar' }).click()
    await expect(page.getByText('La incidencia pasó a "Descartado".')).toBeVisible()
    await page.goto(`/incidencias?estado=Descartado`)
    await expect(page.getByText(code).first()).toBeVisible()
  })

  test('E2E-INC-09: un estudiante no ve incidencias ajenas (RN-010)', async ({ page }) => {
    await login(page, USERS.estudiante2.dni)
    await page.goto(`/incidencias/${code}`)
    await expect(page.getByText(/no tienes acceso/)).toBeVisible()
  })

  test('E2E-INC-10: filtros del listado y búsqueda', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/incidencias')
    await page.locator('#filter-search').fill('filtración')
    await expect(page.getByText('1 incidencia de')).toBeVisible()
    await page.getByRole('button', { name: 'Limpiar filtros' }).click()
    await page.getByLabel('Estado').selectOption('Resuelto')
    await expect(page.getByText('ER-2026-0005').first()).toBeVisible()
    await expect(page).toHaveURL(/estado=Resuelto/)
  })
})
