import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from './fixtures'
import { mkdirSync, writeFileSync } from 'node:fs'
import { login, logout, USERS } from './helpers'

/**
 * Auditoría automática de accesibilidad (WCAG 2.2 A/AA) con axe-core en todas las pantallas,
 * en tema claro y oscuro. Guarda un informe JSON en test-results/axe para las evidencias del proyecto.
 */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

type Finding = { page: string; theme: string; id: string; impact: string | null | undefined; help: string; nodes: number; targets: string[] }
const findings: Finding[] = []
let audited = 0

async function audit(page: Page, name: string, theme: 'claro' | 'oscuro') {
  await page.waitForLoadState('networkidle')
  const result = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  audited++
  for (const v of result.violations) {
    findings.push({
      page: name, theme, id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length,
      targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
    })
  }
}

async function setTheme(page: Page, theme: 'claro' | 'oscuro') {
  await page.evaluate((t) => localStorage.setItem('eduresuelve.theme', t === 'oscuro' ? 'dark' : 'light'), theme)
}

const adminPages: Array<[string, string]> = [
  ['Inicio (Administrador)', '/dashboard'],
  ['Incidencias', '/incidencias'],
  ['Detalle de incidencia', '/incidencias/ER-2026-0004'],
  ['Registrar incidencia', '/incidencias/nueva'],
  ['Seguimiento', '/incidencias/ER-2026-0001/seguimiento'],
  ['Evidencias', '/incidencias/ER-2026-0003/evidencias'],
  ['Resolución', '/incidencias/ER-2026-0003/resolucion'],
  ['Cierre', '/incidencias/ER-2026-0005/cierre'],
  ['Acta de resolución', '/incidencias/ER-2026-0004/acta/ACT-2026-0004-02'],
  ['Panel de calidad', '/calidad'],
  ['Reportes', '/reportes'],
  ['Usuarios', '/usuarios'],
  ['Auditoría', '/auditoria'],
  ['Página no encontrada', '/no-existe'],
]

test.describe('Accesibilidad automática (axe-core, WCAG 2.2 AA)', () => {
  test.describe.configure({ mode: 'serial' })

  for (const theme of ['claro', 'oscuro'] as const) {
    test(`E2E-A11Y: pantallas públicas y del Administrador, tema ${theme}`, async ({ page }) => {
      await page.goto('/login')
      await setTheme(page, theme)
      await page.reload()
      await audit(page, 'Iniciar sesión', theme)
      await page.goto('/verificar')
      await audit(page, 'Verificar acta', theme)

      await login(page, USERS.admin.dni)
      for (const [name, path] of adminPages) {
        await page.goto(path)
        await audit(page, name, theme)
      }
      await logout(page)

      await login(page, USERS.estudiante2.dni)
      await page.goto('/dashboard')
      await audit(page, 'Inicio (Estudiante)', theme)
      await page.goto('/incidencias/ER-2026-0004/encuesta')
      await audit(page, 'Encuesta de satisfacción', theme)
      await logout(page)
    })
  }

  test.afterAll(() => {
    mkdirSync('test-results/axe', { recursive: true })
    writeFileSync('test-results/axe/axe-report.json', JSON.stringify({ audited, tags: TAGS, findings }, null, 2))
  })

  test('E2E-A11Y-RESULT: ninguna pantalla tiene problemas de accesibilidad WCAG 2.2 AA', () => {
    const summary = findings.map((f) => `${f.page} [${f.theme}] ${f.impact} ${f.id}: ${f.help} (${f.nodes}) → ${f.targets.join(' | ')}`)
    expect(summary, summary.join('\n')).toEqual([])
  })
})
