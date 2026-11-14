/**
 * Cálculos de los reportes predefinidos. Son funciones puras sobre las filas de report_incidents,
 * así se prueban sin base de datos y se reutilizan en pantalla, CSV y PDF.
 */
import { incidentCategories, type IncidentCategory } from '../types/incident'
import type { ReportRow } from '../types/report'
import { todayInLima } from './format'

const CLOSED_STATES = ['Resuelto', 'Cerrado', 'Descartado']

export const isOpen = (r: ReportRow) => !CLOSED_STATES.includes(r.status)
export const isOverdue = (r: ReportRow) => isOpen(r) && r.ageHours > r.targetHours
export const isResolved = (r: ReportRow) => r.hoursToResolve !== null
export const withinTarget = (r: ReportRow) => r.hoursToResolve !== null && r.hoursToResolve <= r.targetHours

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : Math.round(((s[mid - 1] + s[mid]) / 2) * 10) / 10
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

/** % (con 1 decimal) o null si no hay base. */
export function pct(part: number, total: number): number | null {
  return total === 0 ? null : Math.round((1000 * part) / total) / 10
}

/** Indicadores comunes de un grupo de incidencias. */
export function summarize(rows: ReportRow[]) {
  const resolved = rows.filter(isResolved)
  const ratings = rows.map((r) => r.surveyRating).filter((v): v is number => v !== null)
  return {
    total: rows.length,
    open: rows.filter(isOpen).length,
    overdue: rows.filter(isOverdue).length,
    resolved: resolved.length,
    closed: rows.filter((r) => r.status === 'Cerrado').length,
    discarded: rows.filter((r) => r.status === 'Descartado').length,
    withinTargetPct: pct(resolved.filter(withinTarget).length, resolved.length),
    avgHoursToResolve: average(resolved.map((r) => r.hoursToResolve!)),
    medianHoursToResolve: median(resolved.map((r) => r.hoursToResolve!)),
    avgRating: average(ratings),
    ratings: ratings.length,
  }
}
export type Summary = ReturnType<typeof summarize>

const monthFormatter = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' })

/** "2026-09" → "setiembre de 2026" */
export function monthLabel(key: string): string {
  const label = monthFormatter.format(new Date(`${key}-01T12:00:00Z`))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** Reporte mensual: agrupado por mes de registro (hora de Lima), del más reciente al más antiguo. */
export function byMonth(rows: ReportRow[]) {
  const groups = new Map<string, ReportRow[]>()
  for (const r of rows) {
    const key = todayInLima(new Date(r.registeredAt)).slice(0, 7)
    groups.set(key, [...(groups.get(key) ?? []), r])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, list]) => ({ key, label: monthLabel(key), ...summarize(list) }))
}

/** Reporte por responsable: carga, vencidas, tiempos y satisfacción. Excluye incidencias sin responsable. */
export function byResponsible(rows: ReportRow[]) {
  const groups = new Map<string, { name: string; role: string; active: boolean; rows: ReportRow[] }>()
  for (const r of rows) {
    if (!r.responsible) continue
    const g = groups.get(r.responsible.id) ?? { name: r.responsible.fullName, role: r.responsible.role, active: r.responsible.status === 'Activo', rows: [] }
    g.rows.push(r)
    groups.set(r.responsible.id, g)
  }
  return [...groups.values()]
    .map((g) => ({ name: g.name, role: g.role, active: g.active, ...summarize(g.rows) }))
    .sort((a, b) => b.open - a.open || b.total - a.total || a.name.localeCompare(b.name))
}

export function unassignedOpen(rows: ReportRow[]) {
  return rows.filter((r) => isOpen(r) && !r.responsible).length
}

/** Reporte por categoría (todas, aunque no tengan casos). */
export function byCategory(rows: ReportRow[]) {
  return incidentCategories.map((category: IncidentCategory) => {
    const list = rows.filter((r) => r.category === category)
    return {
      category,
      ...summarize(list),
      highPriority: list.filter((r) => r.priority === 'Crítica' || r.priority === 'Alta').length,
    }
  })
}

/** Lugares con más incidencias (puntos críticos). */
export function byLocation(rows: ReportRow[], limit = 10) {
  const groups = new Map<string, ReportRow[]>()
  for (const r of rows) {
    const key = r.location.trim()
    groups.set(key, [...(groups.get(key) ?? []), r])
  }
  return [...groups.entries()]
    .map(([location, list]) => {
      const counts = new Map<string, number>()
      for (const r of list) counts.set(r.category, (counts.get(r.category) ?? 0) + 1)
      const topCategory = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
      return { location, total: list.length, open: list.filter(isOpen).length, topCategory }
    })
    .sort((a, b) => b.total - a.total || a.location.localeCompare(b.location))
    .slice(0, limit)
}

/** Pendientes: abiertas ordenadas por urgencia (proporción de la meta consumida). */
export function pending(rows: ReportRow[]) {
  return rows
    .filter(isOpen)
    .map((r) => ({ ...r, targetUsedPct: Math.round((100 * r.ageHours) / r.targetHours), overdue: isOverdue(r) }))
    .sort((a, b) => b.targetUsedPct - a.targetUsedPct)
}

/* ------------------------------ Paginación ------------------------------ */

export const PAGE_SIZES = [10, 25, 50] as const
export const DEFAULT_PAGE_SIZE = 25

/** Calcula la página visible (se ajusta si la página pedida ya no existe tras filtrar). */
export function paginate(total: number, page: number, size: number) {
  const totalPages = Math.max(1, Math.ceil(total / size))
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages)
  const start = (current - 1) * size
  return { page: current, totalPages, start, end: Math.min(start + size, total), total }
}
export type PageInfo = ReturnType<typeof paginate>

/** Fila fuera de la página actual: oculta en pantalla, pero se imprime (el PDF incluye todo). */
export const pageRowClass = (index: number, info: PageInfo) => (index < info.start || index >= info.end ? 'hidden print:table-row' : '')

/**
 * Ruta de regreso desde un acta. Solo se aceptan rutas internas de Reportes,
 * para que el parámetro no pueda usarse para redirigir a otro sitio.
 */
export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value) return null
  return /^\/reportes(\?[^#\s]*)?$/.test(value) ? value : null
}
