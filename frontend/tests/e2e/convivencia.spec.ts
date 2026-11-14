import { expect, test } from './fixtures'
import { login, logout, USERS } from './helpers'

/* Registro formal y convivencia: D.S. 021-2026-MINEDU (8.2, 9.1, IX) y R.M. 383-2025-MINEDU. */
test.describe.serial('Convivencia escolar (D.S. 021-2026-MINEDU)', () => {
  let code = ''

  test('E2E-CON-01: la orientadora registra el hecho con registro formal y documenta a los estudiantes', async ({ page }) => {
    await login(page, USERS.orientador.dni)
    await page.goto('/incidencias/nueva')
    await page.getByLabel('Título').fill('Empujones en la fila de ingreso E2E')
    await page.getByLabel('Descripción').fill('Un estudiante empujó a otro en la fila de ingreso; la auxiliar los separó.')
    await page.getByLabel('Categoría').selectOption('Convivencia')
    await page.getByLabel('Prioridad').selectOption('Alta')
    await page.getByLabel('Fecha del incidente').fill('2026-10-20')
    await page.getByLabel('Lugar').fill('Puerta principal')
    // Sin completar el registro formal, el formulario lo exige
    await page.getByRole('button', { name: 'Registrar incidencia' }).click()
    await expect(page.getByText('Selecciona el régimen aplicable.')).toBeVisible()
    await page.getByLabel('Régimen aplicable').selectOption('Disciplina y violencia')
    await page.getByLabel('Hora del hecho').fill('07:50')
    await page.getByLabel('Acciones inmediatas').fill('La auxiliar separó a los estudiantes y se avisó a ambas familias.')
    await page.getByLabel(/^Declaro que describí/).check()
    await page.getByRole('button', { name: 'Registrar incidencia' }).click()
    await expect(page).toHaveURL(/\/incidencias\/ER-\d{4}-\d{4}$/)
    code = page.url().split('/').pop()!

    await page.getByRole('link', { name: 'Convivencia' }).click()
    await expect(page).toHaveURL(new RegExp(`/incidencias/${code}/convivencia$`))
    await expect(page.getByRole('region', { name: 'Registro formal del incidente' })).toContainText('Disciplina y violencia')

    // Estudiante involucrado, aún sin su versión
    await page.getByRole('button', { name: 'Agregar persona' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Rol en el hecho').selectOption('Estudiante involucrado')
    await dialog.getByLabel('Nombres y apellidos').fill('Mateo Prueba Uno')
    await dialog.getByLabel('DNI').fill('71234567')
    await dialog.getByLabel('Grado y sección').fill('3.º B')
    await dialog.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText('Persona agregada al caso.')).toBeVisible()
    await expect(page.getByText('la versión de los hechos pendiente')).toBeVisible()

    // Se consigna su versión antes de cualquier medida
    await page.getByRole('button', { name: 'Editar Mateo Prueba Uno' }).click()
    await dialog.getByLabel('Estado').selectOption('Registrada')
    await dialog.getByLabel('Brindada por').selectOption('Estudiante')
    await dialog.getByLabel(/^Versión/).fill('Dice que lo empujaron primero.')
    await dialog.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText('“Dice que lo empujaron primero.”')).toBeVisible()

    await page.getByRole('button', { name: 'Agregar persona' }).click()
    await dialog.getByLabel('Rol en el hecho').selectOption('Estudiante afectado')
    await dialog.getByLabel('Nombres y apellidos').fill('Lucía Ejemplo Dos')
    await dialog.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText('Persona agregada al caso.')).toBeVisible()

    // Falta grave: se comunica a Dirección; la orientadora no puede decidir la medida
    await page.getByLabel('Gravedad').selectOption('Grave')
    await page.getByRole('button', { name: 'Guardar calificación' }).click()
    await expect(page.getByText('Pendiente de confirmación de Dirección.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Registrar medida' })).toBeDisabled()

    await page.getByLabel('Código SíseVe').fill('SV-2026-009999')
    await page.getByLabel('Folio del Libro de Registro').fill('052')
    await page.getByRole('button', { name: 'Guardar datos del protocolo' }).click()
    await expect(page.getByText('Datos del protocolo guardados.')).toBeVisible()
  })

  test('E2E-CON-02: Dirección toma conocimiento y decide la medida', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto(`/incidencias/${code}`)
    const banner = page.getByRole('region', { name: 'Comunicación a Dirección' })
    await expect(banner).toContainText('Falta grave comunicada a Dirección')
    await banner.getByRole('link', { name: 'Revisar caso' }).click()
    await page.getByRole('button', { name: 'Confirmar que Dirección tomó conocimiento' }).click()
    await expect(page.getByText(/Dirección tomó conocimiento: Greta Demostración/)).toBeVisible()

    await page.getByRole('button', { name: 'Registrar medida' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Estudiante involucrado').selectOption({ label: 'Mateo Prueba Uno' })
    await dialog.getByLabel('Tipo de medida').selectOption('Disciplinaria')
    await dialog.getByLabel('Descripción de la medida').fill('Suspensión de actividades extracurriculares por dos semanas.')
    await dialog.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText('Medida registrada.')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Medidas adoptadas' })).toContainText('Decidió Greta Demostración')

    // Para emitir el acta: asignar, atender y resolver
    for (const [action, label] of [['review', 'Iniciar revisión'], ['assign', 'Asignar responsable'], ['start', 'Iniciar atención']] as const) {
      await page.goto(`/incidencias/${code}/seguimiento?accion=${action}`)
      if (action === 'assign') await page.locator('select#responsible').selectOption({ label: 'Greta Demostración — Administrador' })
      await page.getByLabel(/^Observación/).fill('Paso del protocolo.')
      await page.getByRole('button', { name: label }).click()
      await expect(page).toHaveURL(new RegExp(`/incidencias/${code}$`))
    }
    await page.goto(`/incidencias/${code}/resolucion`)
    await page.getByLabel('Resumen de la resolución').fill('Se aplicó el protocolo y una medida disciplinaria.')
    await page.getByLabel('Acciones realizadas').fill('Reunión con las familias y medida disciplinaria.')
    await page.getByLabel('Resultado de la atención').fill('No se repitieron los hechos.')
    await page.getByRole('button', { name: /Registrar resolución/ }).click()
    await expect(page).toHaveURL(new RegExp(`/incidencias/${code}$`))
    await logout(page)
  })

  test('E2E-CON-03: el acta incluye el caso y sus copias protegen los datos de otros estudiantes', async ({ page }) => {
    await login(page, USERS.admin.dni)
    await page.goto(`/incidencias/${code}`)
    await page.getByRole('region', { name: 'Acta de resolución' }).getByRole('link', { name: 'Ver acta' }).click()
    const acta = page.getByRole('article')
    await expect(acta).toContainText('Régimen: Disciplina y violencia')
    await expect(acta).toContainText('Base normativa')
    await expect(acta).toContainText('Registro formal del incidente')
    await expect(acta).toContainText('Mateo Prueba Uno')
    await expect(acta).toContainText('71****67')
    await expect(acta).toContainText('SV-2026-009999')
    await expect(acta.getByRole('region', { name: 'Firmas' })).toContainText('Dirección')
    await expect(acta).toContainText('no exime de activar los protocolos')

    await page.getByLabel('Versión del documento').selectOption('familia')
    await page.getByLabel('Familia del estudiante').selectOption({ label: 'Lucía Ejemplo Dos (estudiante afectado)' })
    await expect(acta).toContainText('Copia para la familia de Lucía Ejemplo Dos')
    await expect(acta).toContainText('M. P. U.')
    await expect(acta).not.toContainText('Mateo Prueba Uno')
    await expect(acta).not.toContainText('Dice que lo empujaron primero.')
    await expect(acta).not.toContainText('Suspensión de actividades')

    await page.getByLabel('Versión del documento').selectOption('terceros')
    await expect(acta).toContainText('Copia para terceros')
    await expect(acta).toContainText('71234567')
    await expect(acta).not.toContainText('Lucía Ejemplo Dos')
  })

  test('E2E-CON-04: el estudiante no ve los datos del caso', async ({ page }) => {
    await login(page, USERS.estudiante.dni)
    await page.goto(`/incidencias/${code}/convivencia`)
    await expect(page.getByText(/No encontramos la incidencia|no tienes acceso/)).toBeVisible()
  })
})
