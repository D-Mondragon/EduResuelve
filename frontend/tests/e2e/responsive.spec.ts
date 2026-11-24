import { expect, test, type Page } from './fixtures'
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
      '/incidencias/ER-2026-0003/convivencia',
      '/usuarios',
      '/reportes',
      '/calidad',
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

  test('E2E-RESP-04: en el teléfono los grupos de botones llenan sus filas (ninguno queda suelto a medias)', async ({ page }) => {
    await login(page, USERS.admin.dni)

    // Navegación del detalle (Evidencias, Seguimiento, Convivencia, Acta…) y botones del encabezado
    await page.goto('/incidencias/ER-2026-0004')
    await expectRowsFilled(page, '.action-grid')
    await page.goto('/reportes')
    await expectRowsFilled(page, 'main header .action-grid') // Exportar CSV | Exportar PDF
    await expectRowsFilled(page, '[role="group"][aria-labelledby="preset-label"]') // periodos 2 × 2

    // Formulario: Cancelar y la acción principal en una sola fila
    await page.goto('/incidencias/nueva')
    await expectRowsFilled(page, '.form-actions')
    await expect(page.locator('.form-actions > *')).toHaveCount(2)
    const [cancel, submit] = await page.locator('.form-actions > *').all()
    expect(Math.abs((await cancel.boundingBox())!.y - (await submit.boundingBox())!.y)).toBeLessThan(2)

    // Paginación: Anterior y Siguiente en la misma fila, en los extremos
    await page.goto('/incidencias')
    const pager = page.getByRole('navigation', { name: /^Paginación/ })
    const prev = (await pager.getByRole('button', { name: 'Anterior' }).boundingBox())!
    const next = (await pager.getByRole('button', { name: 'Siguiente' }).boundingBox())!
    expect(Math.abs(prev.y - next.y)).toBeLessThan(2)

    // Acciones de cada usuario: las tres en una fila
    await page.goto('/usuarios')
    const card = page.getByRole('listitem').filter({ has: page.getByRole('button', { name: /^Desactivar a/ }) }).first()
    await expect(card.getByRole('button')).toHaveCount(3) // espera a que cargue la lista antes de medir
    const tops = await card.getByRole('button').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))
    expect(new Set(tops).size).toBe(1)
  })
})

/** Cada fila del grupo ocupa todo su ancho: dos botones parejos o uno que llena la fila. */
async function expectRowsFilled(page: Page, selector: string) {
  const groups = page.locator(selector)
  await expect(groups.first()).toBeVisible()
  for (const group of await groups.all()) {
    const gaps = await group.evaluate((el) => {
      const cs = getComputedStyle(el)
      // Ancho útil: sin el relleno interior (p. ej., px-5 de la barra del formulario)
      const width = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      const gap = parseFloat(cs.columnGap) || 0
      const rows = new Map<number, number>()
      for (const child of el.children) {
        const r = child.getBoundingClientRect()
        if (r.width === 0) continue
        const top = Math.round(r.top)
        rows.set(top, (rows.get(top) ?? -gap) + r.width + gap)
      }
      return [...rows.values()].map((used) => Math.round(width - used))
    })
    for (const free of gaps) expect(free, `Espacio libre en una fila de ${selector}`).toBeLessThanOrEqual(2)
  }
}
