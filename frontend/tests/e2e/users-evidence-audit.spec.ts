import { expect, test } from '@playwright/test'
import { login, logout, USERS } from './helpers'

// PNG válido de 1x1
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test.describe.serial('Gestión de usuarios', () => {
  const dni = '71112222'
  let tempPassword = ''

  test('E2E-USR-01: el administrador crea un usuario con contraseña temporal', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/usuarios')
    await page.getByRole('button', { name: 'Nuevo usuario' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Crear usuario' }).click()
    await expect(dialog.getByText('El DNI debe tener 8 dígitos.')).toBeVisible()
    await dialog.getByLabel('DNI').fill(dni)
    await dialog.getByLabel('Rol').selectOption('Docente')
    await dialog.getByLabel('Nombres').fill('Pedro')
    await dialog.getByLabel('Apellidos').fill('Pruebas')
    await dialog.getByLabel('Correo electrónico').fill('pedro.pruebas@example.com')
    tempPassword = await dialog.getByLabel('Contraseña temporal').inputValue()
    expect(tempPassword).toMatch(/^[A-Za-z]{6}\d{4}$/)
    await dialog.getByRole('button', { name: 'Crear usuario' }).click()
    await expect(page.getByText(/Usuario creado/)).toBeVisible()
    await page.locator('#user-search').fill(dni)
    await expect(page.getByText('Pedro Pruebas').first()).toBeVisible()
  })

  test('E2E-USR-02: el nuevo usuario debe cambiar su contraseña al primer ingreso', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('DNI').fill(dni)
    await page.getByLabel('Contraseña', { exact: true }).fill(tempPassword)
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page).toHaveURL(/\/cambiar-contrasena$/)
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/cambiar-contrasena$/)
    await page.getByLabel('Contraseña actual').fill(tempPassword)
    await page.getByRole('textbox', { name: 'Nueva contraseña', exact: true }).fill('MiClave2026')
    await page.getByLabel('Confirmar nueva contraseña').fill('MiClave2026')
    await page.getByRole('button', { name: 'Guardar contraseña' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Pedro')
  })

  test('E2E-USR-03: desactivar a un responsable deja su caso por reasignar (C4) y se reasigna', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/usuarios')
    await page.locator('#user-search').fill('Camila')
    await page.getByRole('button', { name: 'Desactivar a Camila Ficticia' }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('Tiene incidencias asignadas')
    await dialog.getByRole('button', { name: 'Desactivar' }).click()
    await expect(page.getByText(/pendiente de reasignación/)).toBeVisible()
    await logout(page)

    await login(page, USERS.orientador.dni)
    await page.getByRole('link', { name: /Por reasignar/ }).click()
    await expect(page).toHaveURL(/reasignar=1/)
    await page.getByRole('link', { name: /ER-2026-0002/ }).first().click()
    await expect(page.getByText('Pendiente de reasignación')).toBeVisible()
    await page.getByRole('link', { name: 'Reasignar responsable' }).click()
    await page.locator('select#responsible').selectOption({ label: 'Fabián Imaginario — Orientador' })
    await page.getByLabel('Motivo de la reasignación').fill('La docente fue desactivada.')
    await page.getByRole('button', { name: 'Reasignar' }).click()
    await expect(page.getByText('Responsable reasignado correctamente.')).toBeVisible()
    await expect(page.getByText('Pendiente de reasignación')).toHaveCount(0)
  })

  test('E2E-USR-04: restablecer contraseña muestra la clave temporal', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/usuarios')
    await page.locator('#user-search').fill('Bruno')
    await page.getByRole('button', { name: 'Restablecer clave de Bruno Muestra' }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Restablecer' }).click()
    await expect(dialog.getByText('Contraseña restablecida')).toBeVisible()
  })
})

test.describe('Evidencias', () => {
  test('E2E-EVI-01: subir, ver, descargar y anular una evidencia', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/incidencias/ER-2026-0003/evidencias')
    await page.locator('input[type=file]').setInputFiles({ name: 'foto-aula.png', mimeType: 'image/png', buffer: PNG })
    await expect(page.getByText('foto-aula')).toBeVisible()
    await page.getByLabel('Descripción').fill('Foto de la filtración')
    await page.getByRole('button', { name: 'Subir evidencia' }).click()
    await expect(page.getByText(/Evidencia ".+" agregada/)).toBeVisible()
    await expect(page.getByText('1 de 10 evidencias activas')).toBeVisible()

    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: /^Descargar foto-aula/ }).click()
    expect((await download).suggestedFilename()).toMatch(/^foto-aula\.(png|jpg)$/)

    await page.getByRole('button', { name: /^Anular foto-aula/ }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Anular evidencia' }).click()
    await expect(dialog.getByText('Debe indicar el motivo de la anulación.')).toBeVisible()
    await dialog.getByLabel('Motivo de la anulación').fill('Imagen equivocada')
    await dialog.getByRole('button', { name: 'Anular evidencia' }).click()
    await expect(page.getByText(/Anulada por Greta Demostración/)).toBeVisible()
  })

  test('E2E-EVI-02: rechaza tipos no permitidos y PDF de más de 10 MB con aviso', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/incidencias/ER-2026-0003/evidencias')
    const input = page.locator('input[type=file]')
    await input.setInputFiles({ name: 'virus.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('MZ') })
    await expect(page.getByText('"virus.exe" no es un tipo permitido. Usa PDF, JPG, PNG o DOCX.')).toBeVisible()
    const big = Buffer.alloc(11 * 1024 * 1024, 0x20)
    big.write('%PDF-1.4')
    await input.setInputFiles({ name: 'grande.pdf', mimeType: 'application/pdf', buffer: big })
    await expect(page.getByText(/pesa más de 10 MB.*no se pueden comprimir/)).toBeVisible()
  })

  test('E2E-EVI-03: no se agregan evidencias a incidencias cerradas', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/incidencias/ER-2026-0004/evidencias')
    await expect(page.getByText('No se pueden agregar evidencias a incidencias cerradas.')).toBeVisible()
  })
})

test.describe('Auditoría', () => {
  test('E2E-AUD-01: registra acciones, filtra y exporta CSV', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('DNI').fill(USERS.estudiante2.dni)
    await page.getByLabel('Contraseña', { exact: true }).fill('claveMala1')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByRole('alert')).toBeVisible()

    await login(page, USERS.admin.dni)
    await page.goto('/auditoria')
    await page.getByLabel('Acción').selectOption('Intento fallido de inicio de sesión')
    await expect(page.getByText('Bruno Muestra').first()).toBeVisible()
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportar CSV' }).click()
    const file = await download
    expect(file.suggestedFilename()).toMatch(/^auditoria-eduresuelve-\d{4}-\d{2}-\d{2}\.csv$/)
  })

  test('E2E-AUD-02: un orientador no puede ver la auditoría', async ({ page }) => {
    await login(page, USERS.orientador.dni)
    await page.goto('/auditoria')
    await expect(page.getByText('Acceso restringido')).toBeVisible()
  })
})
