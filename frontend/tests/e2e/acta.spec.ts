import { expect, test } from './fixtures'
import { login, logout, USERS } from './helpers'

// Usa los datos demo: ER-2026-0004 está Cerrada (acta definitiva) y ER-2026-0005 Resuelta (acta provisional).
test.describe('Acta de resolución (RN-011)', () => {
  test('E2E-ACT-01: el acta definitiva muestra todo lo documentado, firmas y código de verificación', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/incidencias/ER-2026-0004')
    const card = page.getByRole('region', { name: 'Acta de resolución' })
    await expect(card).toContainText('ACT-2026-0004-02')
    await expect(card).toContainText('Definitiva')
    await card.getByText('Versiones anteriores (1)').click()
    await expect(card.getByRole('link', { name: 'ACT-2026-0004-01' })).toBeVisible()

    await card.getByRole('link', { name: 'Ver acta' }).click()
    await expect(page).toHaveURL(/\/incidencias\/ER-2026-0004\/acta\/ACT-2026-0004-02$/)
    const acta = page.getByRole('article', { name: 'Acta ACT-2026-0004-02' })
    await expect(acta).toContainText('ACTA DE RESOLUCIÓN')
    await expect(acta).toContainText('Acta definitiva')
    await expect(acta).toContainText('Solicitud de orientación familiar')
    await expect(acta).toContainText('Bruno Muestra (Estudiante)') // registró
    await expect(acta).toContainText('DNI 70****02')
    await expect(acta).toContainText('Fabián Imaginario (Orientador)') // responsable
    await expect(acta).toContainText('Familia y estudiante') // involucrados
    await expect(acta).toContainText('Acciones realizadas')
    await expect(acta).toContainText('Cronología de la atención')
    await expect(acta).toContainText('Estela Inventada (Orientador)') // cerró
    await expect(acta.getByRole('region', { name: 'Firmas' })).toContainText('Responsable de la atención')
    await expect(acta).toContainText(/Código de verificación: [0-9A-F]{4}(-[0-9A-F]{4}){3}/)
    await expect(page.getByRole('button', { name: 'Descargar PDF' })).toBeVisible()
  })

  test('E2E-ACT-02: al imprimir solo se ve la hoja del acta', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/incidencias/ER-2026-0004/acta/ACT-2026-0004-02')
    await expect(page.getByRole('article')).toBeVisible()
    await page.emulateMedia({ media: 'print' })
    await expect(page.getByRole('button', { name: 'Descargar PDF' })).toBeHidden()
    await expect(page.locator('aside').first()).toBeHidden()
    await expect(page.getByRole('article')).toBeVisible()
  })

  test('E2E-ACT-06: el acta trae un código QR y el enlace "Verificar acta" que lleva a la verificación pública', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/incidencias/ER-2026-0004/acta/ACT-2026-0004-02')
    const acta = page.getByRole('article')
    const code = (await acta.getByText(/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/).first().innerText()).trim()
    await expect(acta.getByRole('img', { name: `Código QR para verificar el acta ${code}` })).toBeVisible()
    const link = acta.getByRole('link', { name: 'Verificar acta' })
    expect(await link.getAttribute('href')).toMatch(new RegExp(`/verificar[?]codigo=${code}$`))
    await expect(link).toHaveAttribute('target', '_blank')

    // Al imprimir: el QR se mantiene y el botón se oculta (en papel no se puede pulsar)
    await page.emulateMedia({ media: 'print' })
    await expect(acta.getByRole('img', { name: /Código QR/ })).toBeVisible()
    await expect(link).toBeHidden()
    await page.emulateMedia({ media: 'screen' })

    // Seguir el enlace (sin sesión, como quien escanea el QR) confirma el acta
    const [verify] = await Promise.all([page.context().waitForEvent('page'), link.click()])
    await expect(verify.getByText('Acta auténtica y vigente')).toBeVisible()
    await expect(verify.getByText('ACT-2026-0004-02')).toBeVisible()
  })

  test('E2E-ACT-03: el estudiante que registró ve la versión resumida, sin terceros ni observaciones internas', async ({ page }) => {
    await login(page, USERS.estudiante2.dni)
    await page.goto('/incidencias/ER-2026-0004/acta/ACT-2026-0004-02')
    const acta = page.getByRole('article')
    await expect(acta).toContainText('Versión para el interesado')
    await expect(acta).toContainText('Medidas adoptadas y resolución')
    await expect(acta).not.toContainText('Familia y estudiante')
    await expect(acta).not.toContainText('Personas involucradas')
  })

  test('E2E-ACT-04: un acta reemplazada se marca como no vigente', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/incidencias/ER-2026-0004/acta/ACT-2026-0004-01')
    await expect(page.getByText('Esta acta ya no está vigente')).toBeVisible()
    await expect(page.getByRole('article')).toContainText('Reemplazada')
  })

  test('E2E-ACT-05: cualquiera puede verificar un acta impresa sin iniciar sesión', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto('/incidencias/ER-2026-0004/acta/ACT-2026-0004-02')
    const footer = await page.getByRole('article').textContent()
    const code = footer!.match(/Código de verificación: ([0-9A-F]{4}(?:-[0-9A-F]{4}){3})/)![1]
    await logout(page)

    // Desde el enlace impreso: verifica automáticamente
    await page.goto(`/verificar?codigo=${code}`)
    await expect(page.getByText('Acta auténtica y vigente')).toBeVisible()
    await expect(page.getByText('ACT-2026-0004-02')).toBeVisible()
    await expect(page.locator('main')).not.toContainText('Bruno')

    // Código mal escrito
    await page.getByLabel('Código de verificación').fill('0000000000000000')
    await page.getByRole('button', { name: 'Verificar' }).click()
    await expect(page.getByText('No se pudo confirmar el acta')).toBeVisible()

    // Acceso desde el login
    await page.goto('/login')
    await page.getByRole('link', { name: 'Verifica su autenticidad' }).click()
    await expect(page).toHaveURL(/\/verificar$/)
  })

  test('E2E-ACT-06: una incidencia resuelta tiene acta provisional pendiente de validación', async ({ page }) => {
    await login(page, USERS.orientador.dni)
    await page.goto('/incidencias/ER-2026-0005')
    await page.getByRole('link', { name: 'Acta', exact: true }).click()
    await expect(page.getByRole('article')).toContainText('Acta provisional · pendiente de validación')
    await expect(page.getByRole('article')).toContainText('Pendiente de validación por Orientación o Administración')
  })
})
