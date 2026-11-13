import {
  AlertTriangle,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FileChartColumn,
  FileDown,
  FileSpreadsheet,
  FilterX,
  Hourglass,
  MapPin,
  Search,
  SearchX,
  UserRoundSearch,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useMemo, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useCurrentUser } from '../auth/authContext'
import { Badge, PriorityBadge, StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, EmptyState, ErrorState, LoadingState, PageHeader, StatCard } from '../components/ui/Feedback'
import { controlClass } from '../components/ui/Field'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { toCsv } from '../lib/csv'
import { saveBlob } from '../lib/files'
import { formatDate, formatDateTime, pluralize, todayInLima } from '../lib/format'
import { formatHours, formatPct } from '../lib/quality'
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  paginate,
  type PageInfo,
  byCategory,
  byLocation,
  byMonth,
  byResponsible,
  isOverdue,
  pending,
  summarize,
  unassignedOpen,
  withinTarget,
} from '../lib/reports'
import { cn } from '../lib/ui'
import { incidentCategories, incidentPriorities, incidentStatuses } from '../types/incident'
import type { ReportRow } from '../types/report'

/* ------------------------------ Periodo ------------------------------- */

type Preset = 'mes' | '90' | 'anio' | 'todo' | 'personalizado'

function presetRange(preset: Preset, today = todayInLima()): { from: string; to: string } {
  const [y, m] = today.split('-')
  if (preset === 'mes') return { from: `${y}-${m}-01`, to: today }
  if (preset === 'anio') return { from: `${y}-01-01`, to: today }
  if (preset === '90') {
    const d = new Date(`${today}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() - 89)
    return { from: d.toISOString().slice(0, 10), to: today }
  }
  return { from: '', to: '' }
}

const presets: Array<[Preset, string]> = [
  ['mes', 'Este mes'],
  ['90', 'Últimos 90 días'],
  ['anio', 'Este año'],
  ['todo', 'Todo'],
]

/* ------------------------------ Pestañas ------------------------------ */

type TabId = 'incidencias' | 'mensual' | 'responsables' | 'categorias' | 'pendientes'
const tabs: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: 'incidencias', label: 'Incidencias', icon: ClipboardList },
  { id: 'mensual', label: 'Mensual', icon: CalendarRange },
  { id: 'responsables', label: 'Por responsable', icon: UserRoundSearch },
  { id: 'categorias', label: 'Por categoría y lugar', icon: MapPin },
  { id: 'pendientes', label: 'Pendientes y vencidas', icon: Hourglass },
]

/* ---------------------------- Piezas comunes --------------------------- */

const th = 'px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted first:pl-5 sm:first:pl-6'
const td = 'px-3 py-2.5 align-middle text-sm text-ink first:pl-5 sm:first:pl-6'
const num = 'tabular-nums'

function DataTable({ caption, head, children, minWidth = '48rem' }: { caption: string; head: string[]; children: ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line">
          <tr>
            {head.map((h) => (
              <th className={th} key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  )
}

/** Barra horizontal de un solo tono con la cifra al lado. */
function Bar({ value, max, label, text }: { value: number; max: number; label: string; text?: string }) {
  const width = max > 0 ? Math.min(100, (100 * value) / max) : 0
  return (
    <span className="flex min-w-24 items-center gap-2">
      <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <span className="block h-full rounded-full bg-emerald-600 dark:bg-emerald-500" style={{ width: `${width}%` }} />
      </span>
      <span className={cn(num, 'w-12 text-right text-sm')} title={label}>
        {text ?? value}
      </span>
    </span>
  )
}

function Rating({ avg, count }: { avg: number | null; count: number }) {
  if (avg === null) return <span className="text-muted">—</span>
  return (
    <span className={num}>
      {avg.toLocaleString('es-PE')} / 5 <span className="text-xs text-muted">({count})</span>
    </span>
  )
}

function ActaLink({ row, returnTo }: { row: ReportRow; returnTo: string }) {
  if (!row.acta) return <span className="text-muted">—</span>
  const href = `/incidencias/${encodeURIComponent(row.code)}/acta/${encodeURIComponent(row.acta.number)}?volver=${encodeURIComponent(returnTo)}`
  return (
    <Link
      aria-label={`Ver acta ${row.acta.kind.toLowerCase()} ${row.acta.number} de ${row.code}`}
      className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-600 dark:text-emerald-400 dark:hover:bg-emerald-400/10"
      title={`Ver acta ${row.acta.kind.toLowerCase()} ${row.acta.number}`}
      to={href}
    >
      <Eye aria-hidden="true" className="size-4 print:hidden" />
      <span className="print:hidden">{row.acta.kind === 'Definitiva' ? 'Definitiva' : 'Provisional'}</span>
      <span className="hidden font-mono text-xs print:inline">{row.acta.number}</span>
    </Link>
  )
}

/** Fila fuera de la página actual: oculta en pantalla, pero se imprime (el PDF incluye todo). */
const pageRowClass = (index: number, info: PageInfo) => (index < info.start || index >= info.end ? 'hidden print:table-row' : '')

function Pager({
  info,
  size,
  label,
  onStep,
  onSize,
}: {
  info: PageInfo
  size: number
  label: string
  onStep: (delta: number, totalPages: number) => void
  onSize: (size: number) => void
}) {
  if (info.total === 0) return null
  return (
    <nav
      aria-label={`Paginación de ${label}`}
      className="flex flex-col gap-3 border-t border-line px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 print:hidden"
    >
      <p aria-live="polite" className="text-sm text-muted">
        Mostrando <span className="font-medium text-ink">{info.start + 1}–{info.end}</span> de{' '}
        <span className="font-medium text-ink">{info.total}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted" htmlFor={`page-size-${label}`}>
          Filas por página
          <select className={cn(controlClass, 'w-auto py-1.5')} id={`page-size-${label}`} onChange={(e) => onSize(Number(e.target.value))} value={size}>
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <Button disabled={info.page <= 1} icon={ChevronLeft} onClick={() => onStep(-1, info.totalPages)} size="sm" variant="secondary">
          Anterior
        </Button>
        <span className="min-w-24 text-center text-sm tabular-nums text-ink-2">
          Página {info.page} de {info.totalPages}
        </span>
        <Button disabled={info.page >= info.totalPages} onClick={() => onStep(1, info.totalPages)} size="sm" variant="secondary">
          Siguiente
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </nav>
  )
}

function CodeLink({ code }: { code: string }) {
  return (
    <Link className="whitespace-nowrap font-mono text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400" to={`/incidencias/${encodeURIComponent(code)}`}>
      {code}
    </Link>
  )
}

function ResolutionTime({ row }: { row: ReportRow }) {
  if (row.hoursToResolve === null) return <span className="text-muted">—</span>
  const ok = withinTarget(row)
  return (
    <span className="whitespace-nowrap">
      <span className={num}>{formatHours(row.hoursToResolve)}</span>{' '}
      <span className={cn('text-xs', ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400')}>
        {ok ? '(en meta)' : '(fuera de meta)'}
      </span>
    </span>
  )
}

/* ------------------------------ Vistas -------------------------------- */

interface IncidentFilters {
  search: string
  status: string
  category: string
  priority: string
  responsible: string
}

function filterRows(rows: ReportRow[], f: IncidentFilters) {
  const term = f.search.trim().toLocaleLowerCase('es')
  return rows.filter(
    (r) =>
      (!term || [r.code, r.title, r.location].some((v) => v.toLocaleLowerCase('es').includes(term))) &&
      (!f.status || r.status === f.status) &&
      (!f.category || r.category === f.category) &&
      (!f.priority || r.priority === f.priority) &&
      (!f.responsible || (f.responsible === '__none' ? !r.responsible : r.responsible?.id === f.responsible)),
  )
}

function IncidentsView({ rows, info, returnTo }: { rows: ReportRow[]; info: PageInfo; returnTo: string }) {
  return (
    <DataTable
      caption="Reporte de incidencias"
      head={['Código', 'Título', 'Prioridad', 'Estado', 'Acta', 'Categoría', 'Registro', 'Responsable', 'Resolución']}
      minWidth="64rem"
    >
      {rows.map((r, index) => (
        <tr className={cn('hover:bg-surface-2', pageRowClass(index, info))} key={r.code}>
          <td className={td}>
            <CodeLink code={r.code} />
          </td>
          <td className={cn(td, 'max-w-64')}>{r.title}</td>
          <td className={td}>
            <PriorityBadge priority={r.priority} />
          </td>
          <td className={td}>
            <StatusBadge status={r.status} />
          </td>
          <td className={cn(td, 'py-1')}>
            <ActaLink returnTo={returnTo} row={r} />
          </td>
          <td className={cn(td, 'text-ink-2')}>{r.category}</td>
          <td className={cn(td, 'whitespace-nowrap text-ink-2')}>{formatDate(r.registeredAt.slice(0, 10))}</td>
          <td className={cn(td, 'text-ink-2')}>{r.responsible?.fullName ?? <span className="text-muted">Sin asignar</span>}</td>
          <td className={td}>
            <ResolutionTime row={r} />
          </td>
        </tr>
      ))}
    </DataTable>
  )
}

function MonthlyView({ rows }: { rows: ReportRow[] }) {
  const months = byMonth(rows)
  const max = Math.max(1, ...months.map((m) => m.total))
  return (
    <DataTable
      caption="Reporte mensual por mes de registro"
      head={['Mes de registro', 'Registradas', 'Resueltas', 'Cerradas', 'Descartadas', 'Abiertas', 'Vencidas', 'En meta', 'Mediana de resolución', 'Satisfacción']}
      minWidth="62rem"
    >
      {months.map((m) => (
        <tr key={m.key}>
          <td className={cn(td, 'font-medium')}>{m.label}</td>
          <td className={td}>
            <Bar label={`${m.total} registradas`} max={max} value={m.total} />
          </td>
          <td className={cn(td, num)}>{m.resolved}</td>
          <td className={cn(td, num)}>{m.closed}</td>
          <td className={cn(td, num)}>{m.discarded}</td>
          <td className={cn(td, num)}>{m.open}</td>
          <td className={cn(td, num, m.overdue > 0 && 'font-semibold text-rose-700 dark:text-rose-400')}>{m.overdue}</td>
          <td className={cn(td, num)}>{formatPct(m.withinTargetPct)}</td>
          <td className={cn(td, num)}>{formatHours(m.medianHoursToResolve)}</td>
          <td className={td}>
            <Rating avg={m.avgRating} count={m.ratings} />
          </td>
        </tr>
      ))}
    </DataTable>
  )
}

function ResponsibleView({ rows }: { rows: ReportRow[] }) {
  const people = byResponsible(rows)
  const unassigned = unassignedOpen(rows)
  return (
    <>
      {unassigned > 0 && (
        <p className="border-b border-line px-5 py-3 text-sm text-amber-800 sm:px-6 dark:text-amber-300">
          <AlertTriangle aria-hidden="true" className="mr-1.5 inline size-4" />
          {pluralize(unassigned, 'incidencia abierta aún no tiene responsable', 'incidencias abiertas aún no tienen responsable')}.
        </p>
      )}
      <DataTable
        caption="Reporte por responsable"
        head={['Responsable', 'Asignadas', 'Abiertas', 'Vencidas', 'Resueltas', 'En meta', 'Mediana de resolución', 'Satisfacción']}
        minWidth="56rem"
      >
        {people.map((p) => (
          <tr key={p.name}>
            <td className={td}>
              <span className="font-medium">{p.name}</span>
              <span className="block text-xs text-muted">
                {p.role}
                {!p.active && ' · Inactivo'}
              </span>
            </td>
            <td className={cn(td, num)}>{p.total}</td>
            <td className={cn(td, num)}>{p.open}</td>
            <td className={cn(td, num, p.overdue > 0 && 'font-semibold text-rose-700 dark:text-rose-400')}>{p.overdue}</td>
            <td className={cn(td, num)}>{p.resolved}</td>
            <td className={cn(td, num)}>{formatPct(p.withinTargetPct)}</td>
            <td className={cn(td, num)}>{formatHours(p.medianHoursToResolve)}</td>
            <td className={td}>
              <Rating avg={p.avgRating} count={p.ratings} />
            </td>
          </tr>
        ))}
      </DataTable>
    </>
  )
}

function CategoryView({ rows }: { rows: ReportRow[] }) {
  const categories = byCategory(rows)
  const locations = byLocation(rows)
  const max = Math.max(1, ...categories.map((c) => c.total))
  return (
    <>
      <DataTable
        caption="Reporte por categoría"
        head={['Categoría', 'Total', 'Abiertas', 'Resueltas', 'Descartadas', 'Crítica o Alta', 'En meta', 'Mediana de resolución']}
        minWidth="54rem"
      >
        {categories.map((c) => (
          <tr key={c.category}>
            <td className={cn(td, 'font-medium')}>{c.category}</td>
            <td className={td}>
              <Bar label={`${c.total} incidencias`} max={max} value={c.total} />
            </td>
            <td className={cn(td, num)}>{c.open}</td>
            <td className={cn(td, num)}>{c.resolved}</td>
            <td className={cn(td, num)}>{c.discarded}</td>
            <td className={cn(td, num)}>{c.highPriority}</td>
            <td className={cn(td, num)}>{formatPct(c.withinTargetPct)}</td>
            <td className={cn(td, num)}>{formatHours(c.medianHoursToResolve)}</td>
          </tr>
        ))}
      </DataTable>
      <h3 className="border-t border-line px-5 pt-5 pb-2 text-sm font-semibold text-ink sm:px-6">Lugares con más incidencias</h3>
      <DataTable caption="Lugares con más incidencias" head={['Lugar', 'Total', 'Abiertas', 'Categoría más frecuente']} minWidth="36rem">
        {locations.map((l) => (
          <tr key={l.location}>
            <td className={cn(td, 'font-medium')}>{l.location}</td>
            <td className={cn(td, num)}>{l.total}</td>
            <td className={cn(td, num)}>{l.open}</td>
            <td className={cn(td, 'text-ink-2')}>{l.topCategory}</td>
          </tr>
        ))}
      </DataTable>
    </>
  )
}

function PendingView({ list, info }: { list: ReturnType<typeof pending>; info: PageInfo }) {
  return (
    <DataTable
      caption="Incidencias pendientes ordenadas por urgencia"
      head={['Código', 'Título', 'Prioridad', 'Estado', 'Responsable', 'Antigüedad', 'Meta', 'Meta consumida', 'Situación']}
      minWidth="62rem"
    >
      {list.map((r, index) => (
        <tr className={pageRowClass(index, info)} key={r.code}>
          <td className={td}>
            <CodeLink code={r.code} />
          </td>
          <td className={cn(td, 'max-w-56')}>{r.title}</td>
          <td className={td}>
            <PriorityBadge priority={r.priority} />
          </td>
          <td className={td}>
            <StatusBadge status={r.status} />
          </td>
          <td className={cn(td, 'text-ink-2')}>
            {r.responsible?.fullName ?? <span className="text-muted">Sin asignar</span>}
            {r.pendingReassignment && <span className="block text-xs text-amber-700 dark:text-amber-400">Por reasignar</span>}
          </td>
          <td className={cn(td, num, 'whitespace-nowrap')}>{formatHours(r.ageHours)}</td>
          <td className={cn(td, num, 'whitespace-nowrap')}>{formatHours(r.targetHours)}</td>
          <td className={td}>
            <Bar label={`${r.targetUsedPct} % de la meta`} max={100} text={`${r.targetUsedPct} %`} value={r.targetUsedPct} />
          </td>
          <td className={td}>
            {r.overdue ? (
              <Badge className="bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-300">
                <AlertTriangle aria-hidden="true" className="size-3.5" />
                Vencida
              </Badge>
            ) : (
              <Badge className="bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300">En plazo</Badge>
            )}
          </td>
        </tr>
      ))}
    </DataTable>
  )
}

/* ------------------------------ Exportación ----------------------------- */

function csvFor(tab: TabId, rows: ReportRow[]): { headers: string[]; data: Array<Array<string | number | null>> } {
  const h = (v: number | null) => (v === null ? '' : v)
  if (tab === 'mensual') {
    return {
      headers: ['Mes de registro', 'Registradas', 'Resueltas', 'Cerradas', 'Descartadas', 'Abiertas', 'Vencidas', '% en meta', 'Mediana resolución (h)', 'Satisfacción promedio', 'Encuestas'],
      data: byMonth(rows).map((m) => [m.label, m.total, m.resolved, m.closed, m.discarded, m.open, m.overdue, h(m.withinTargetPct), h(m.medianHoursToResolve), h(m.avgRating), m.ratings]),
    }
  }
  if (tab === 'responsables') {
    return {
      headers: ['Responsable', 'Rol', 'Activo', 'Asignadas', 'Abiertas', 'Vencidas', 'Resueltas', '% en meta', 'Mediana resolución (h)', 'Satisfacción promedio', 'Encuestas'],
      data: byResponsible(rows).map((p) => [p.name, p.role, p.active ? 'Sí' : 'No', p.total, p.open, p.overdue, p.resolved, h(p.withinTargetPct), h(p.medianHoursToResolve), h(p.avgRating), p.ratings]),
    }
  }
  if (tab === 'categorias') {
    return {
      headers: ['Categoría', 'Total', 'Abiertas', 'Resueltas', 'Descartadas', 'Crítica o Alta', '% en meta', 'Mediana resolución (h)'],
      data: byCategory(rows).map((c) => [c.category, c.total, c.open, c.resolved, c.discarded, c.highPriority, h(c.withinTargetPct), h(c.medianHoursToResolve)]),
    }
  }
  if (tab === 'pendientes') {
    return {
      headers: ['Código', 'Título', 'Prioridad', 'Estado', 'Responsable', 'Antigüedad (h)', 'Meta (h)', '% meta consumida', 'Situación'],
      data: pending(rows).map((r) => [r.code, r.title, r.priority, r.status, r.responsible?.fullName ?? 'Sin asignar', r.ageHours, r.targetHours, r.targetUsedPct, r.overdue ? 'Vencida' : 'En plazo']),
    }
  }
  return {
    headers: ['Código', 'Título', 'Categoría', 'Prioridad', 'Estado', 'Lugar', 'Registro (Lima)', 'Registró', 'Responsable', 'Resolución (h)', 'Meta (h)', 'En meta', 'Cierre (Lima)', 'Acta vigente', 'Tipo de acta', 'Satisfacción'],
    data: rows.map((r) => [
      r.code, r.title, r.category, r.priority, r.status, r.location, formatDateTime(r.registeredAt), r.reporter?.fullName ?? '', r.responsible?.fullName ?? '',
      h(r.hoursToResolve), r.targetHours, r.hoursToResolve === null ? '' : withinTarget(r) ? 'Sí' : 'No',
      r.closedAt ? formatDateTime(r.closedAt) : '', r.acta?.number ?? '', r.acta?.kind ?? '', h(r.surveyRating),
    ]),
  }
}

/* -------------------------------- Página -------------------------------- */

/** Parámetro de la URL de cada filtro: el estado del reporte vive en la URL. */
const filterParam: Record<keyof IncidentFilters, string> = {
  search: 'q',
  status: 'estado',
  category: 'categoria',
  priority: 'prioridad',
  responsible: 'responsable',
}
const presetIds: Preset[] = ['mes', '90', 'anio', 'todo', 'personalizado']

function ReportsPage() {
  const me = useCurrentUser()
  const [params, setParams] = useSearchParams()
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  // Al volver de un acta, el reporte se recupera tal cual desde la URL
  const tab = tabs.find((t) => t.id === params.get('vista'))?.id ?? 'incidencias'
  const preset = presetIds.find((id) => id === params.get('periodo')) ?? 'anio'
  const custom = preset === 'personalizado'
  const from = custom ? (params.get('desde') ?? '') : presetRange(preset).from
  const to = custom ? (params.get('hasta') ?? '') : presetRange(preset).to
  const search = params.get('q') ?? ''
  const status = params.get('estado') ?? ''
  const category = params.get('categoria') ?? ''
  const priority = params.get('prioridad') ?? ''
  const responsible = params.get('responsable') ?? ''
  const filters: IncidentFilters = { search, status, category, priority, responsible }
  const requestedSize = Number(params.get('tam'))
  const pageSize = (PAGE_SIZES as readonly number[]).includes(requestedSize) ? requestedSize : DEFAULT_PAGE_SIZE
  const requestedPage = Number(params.get('pagina')) || 1
  const query = params.toString()
  const returnTo = `/reportes${query ? `?${query}` : ''}`

  /** Cambia parámetros de la URL; salvo que se indique, vuelve a la página 1. */
  const update = useCallback(
    (changes: Record<string, string | null>, resetPage = true) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(changes)) {
            if (value === null || value === '') next.delete(key)
            else next.set(key, value)
          }
          if (resetPage) next.delete('pagina')
          return next
        },
        { replace: true },
      ),
    [setParams],
  )
  const setTab = (id: TabId) => update({ vista: id === 'incidencias' ? null : id })
  const setFilter = (key: keyof IncidentFilters, value: string) => update({ [filterParam[key]]: value })
  const clearIncidentFilters = () => update(Object.fromEntries(Object.values(filterParam).map((k) => [k, null])))

  const load = useCallback(() => api.reportIncidents(from, to), [from, to])
  const { data, error, loading, reload } = useAsync(load)
  const rows = useMemo(() => data ?? [], [data])

  const responsibles = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of rows) if (r.responsible) map.set(r.responsible.id, r.responsible.fullName)
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [rows])
  const visibleIncidents = useMemo(
    () => filterRows(rows, { search, status, category, priority, responsible }),
    [rows, search, status, category, priority, responsible],
  )
  const pendingList = useMemo(() => pending(rows), [rows])
  const hasFilters = Object.values(filters).some(Boolean)
  const incidentPage = paginate(visibleIncidents.length, requestedPage, pageSize)
  const pendingPage = paginate(pendingList.length, requestedPage, pageSize)
  const pagerProps = {
    size: pageSize,
    // Se calcula sobre la página actual de la URL: varios clics seguidos avanzan una página cada uno
    onStep: (delta: number, totalPages: number) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          const target = Math.min(Math.max(1, (Number(prev.get('pagina')) || 1) + delta), totalPages)
          if (target > 1) next.set('pagina', String(target))
          else next.delete('pagina')
          return next
        },
        { replace: true },
      ),
    onSize: (size: number) => update({ tam: size === DEFAULT_PAGE_SIZE ? null : String(size) }),
  }
  const summary = useMemo(() => summarize(rows), [rows])
  const current = tabs.find((t) => t.id === tab)!
  const exportRows = tab === 'incidencias' ? visibleIncidents : rows

  function choosePreset(next: Preset) {
    update({ periodo: next === 'anio' ? null : next, desde: null, hasta: null })
  }

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!delta && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + delta + tabs.length) % tabs.length
    setTab(tabs[next].id)
    tabRefs.current[next]?.focus()
  }

  function exportCsv() {
    const { headers, data: lines } = csvFor(tab, exportRows)
    const csv = toCsv(headers, lines)
    saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `reporte-${tab}-${from || 'inicio'}-a-${to || todayInLima()}.csv`)
  }

  const periodText = from || to
    ? `del ${from ? formatDate(from, 'long') : 'inicio'} al ${to ? formatDate(to, 'long') : 'hoy'}`
    : 'de todo el historial'

  return (
    <div className="print-landscape space-y-6">
      <PageHeader
        actions={
          <>
            <Button disabled={!data || exportRows.length === 0} icon={FileSpreadsheet} onClick={exportCsv} variant="secondary">
              Exportar CSV
            </Button>
            <Button disabled={!data || exportRows.length === 0} icon={FileDown} onClick={() => window.print()} title="Abre el diálogo de impresión: elige “Guardar como PDF”" variant="secondary">
              Exportar PDF
            </Button>
          </>
        }
        description="Consulta qué está pasando: volumen, tiempos, responsables, lugares y pendientes."
        icon={FileChartColumn}
        title="Reportes"
      />

      {/* Periodo */}
      <section aria-label="Periodo del reporte" className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between print:hidden">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted" id="preset-label">
            Periodo (fecha de registro)
          </p>
          <div aria-labelledby="preset-label" className="flex flex-wrap gap-1.5" role="group">
            {presets.map(([id, label]) => (
              <button
                aria-pressed={preset === id}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-sm font-medium',
                  preset === id ? 'border-emerald-700 bg-emerald-700 text-white dark:border-emerald-700' : 'border-line text-ink-2 hover:bg-surface-2',
                )}
                key={id}
                onClick={() => choosePreset(id)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:w-80">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="report-from">
              Desde
            </label>
            <input
              className={controlClass}
              id="report-from"
              max={to || undefined}
              onChange={(e) => update({ periodo: 'personalizado', desde: e.target.value, hasta: to })}
              type="date"
              value={from}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="report-to">
              Hasta
            </label>
            <input
              className={controlClass}
              id="report-to"
              min={from || undefined}
              onChange={(e) => update({ periodo: 'personalizado', desde: from, hasta: e.target.value })}
              type="date"
              value={to}
            />
          </div>
        </div>
      </section>

      <p className="hidden text-sm print:block">
        Reporte «{current.label}» · Periodo {periodText}
        {tab === 'incidencias' && hasFilters && ' · con filtros aplicados'} · Generado por {me.fullName} el {formatDateTime(new Date().toISOString())}
      </p>

      {loading && !data ? (
        <LoadingState label="Preparando el reporte…" />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={() => reload()} />
      ) : (
        <>
          <section aria-label="Resumen del periodo" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard icon={ClipboardList} label="Incidencias" value={summary.total} />
            <StatCard icon={Hourglass} label="Abiertas" tone="bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300" value={summary.open} />
            <StatCard icon={AlertTriangle} label="Vencidas" tone="bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300" value={summary.overdue} />
            <StatCard hint={`${summary.resolved} resueltas`} icon={CalendarRange} label="En meta" value={formatPct(summary.withinTargetPct)} />
            <StatCard
              hint={pluralize(summary.ratings, 'encuesta', 'encuestas')}
              icon={UserRoundSearch}
              label="Satisfacción"
              tone="bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
              value={summary.avgRating === null ? '—' : `${summary.avgRating.toLocaleString('es-PE')} / 5`}
            />
          </section>

          <div aria-label="Tipo de reporte" className="flex gap-1 overflow-x-auto border-b border-line print:hidden" role="tablist">
            {tabs.map(({ id, label, icon: Icon }, index) => (
              <button
                aria-controls={`panel-${id}`}
                aria-selected={tab === id}
                className={cn(
                  '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-emerald-600',
                  tab === id ? 'border-emerald-700 text-emerald-800 dark:border-emerald-400 dark:text-emerald-300' : 'border-transparent text-muted hover:text-ink',
                )}
                id={`tab-${id}`}
                key={id}
                onClick={() => setTab(id)}
                onKeyDown={(e) => onTabKey(e, index)}
                ref={(el) => {
                  tabRefs.current[index] = el
                }}
                role="tab"
                tabIndex={tab === id ? 0 : -1}
                type="button"
              >
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </button>
            ))}
          </div>

          <div aria-labelledby={`tab-${tab}`} id={`panel-${tab}`} role="tabpanel">
            {rows.length === 0 ? (
              <EmptyState description="Prueba con otro periodo." icon={SearchX} title="No hay incidencias registradas en el periodo" />
            ) : (
              <Card label={current.label}>
                <CardHeader
                  description={
                    tab === 'incidencias'
                      ? `${pluralize(visibleIncidents.length, 'incidencia', 'incidencias')} ${periodText}. El ojo abre el acta vigente; con «Volver a Reportes» regresas aquí.`
                      : tab === 'mensual'
                        ? 'Agrupado por el mes en que se registró cada incidencia.'
                        : tab === 'responsables'
                          ? 'Carga actual, vencidas, tiempos y satisfacción de quienes atienden.'
                          : tab === 'categorias'
                            ? 'Tipos de incidencia y lugares que concentran más casos.'
                            : 'Incidencias abiertas ordenadas por cuánto de su meta de tiempo ya consumieron.'
                  }
                  icon={current.icon}
                  title={current.label}
                />

                {tab === 'incidencias' && (
                  <div className="grid grid-cols-1 gap-3 border-b border-line p-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-[minmax(12rem,1.4fr)_repeat(4,minmax(8rem,1fr))_auto] print:hidden">
                    <div className="sm:col-span-2 lg:col-span-1">
                      <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="report-search">
                        Buscar
                      </label>
                      <div className="relative">
                        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                        <input
                          className={cn(controlClass, 'pl-9')}
                          id="report-search"
                          onChange={(e) => setFilter('search', e.target.value)}
                          placeholder="Código, título o lugar…"
                          type="search"
                          value={filters.search}
                        />
                      </div>
                    </div>
                    {(
                      [
                        ['status', 'Estado', incidentStatuses.map((s) => [s, s])],
                        ['category', 'Categoría', incidentCategories.map((s) => [s, s])],
                        ['priority', 'Prioridad', incidentPriorities.map((s) => [s, s])],
                        ['responsible', 'Responsable', [['__none', 'Sin asignar'], ...responsibles]],
                      ] as Array<[keyof IncidentFilters, string, string[][]]>
                    ).map(([key, label, options]) => (
                      <div key={key}>
                        <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor={`report-${key}`}>
                          {label}
                        </label>
                        <select className={controlClass} id={`report-${key}`} onChange={(e) => setFilter(key, e.target.value)} value={filters[key]}>
                          <option value="">Todos</option>
                          {options.map(([value, text]) => (
                            <option key={value} value={value}>
                              {text}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                    <div className="flex items-end">
                      <Button disabled={!hasFilters} icon={FilterX} onClick={clearIncidentFilters} variant="ghost">
                        Limpiar
                      </Button>
                    </div>
                  </div>
                )}

                {tab === 'incidencias' &&
                  (visibleIncidents.length === 0 ? (
                    <p className="p-5 text-sm text-muted sm:p-6">Ninguna incidencia coincide con los filtros.</p>
                  ) : (
                    <>
                      <IncidentsView info={incidentPage} returnTo={returnTo} rows={visibleIncidents} />
                      <Pager info={incidentPage} label="incidencias" {...pagerProps} />
                    </>
                  ))}
                {tab === 'mensual' && <MonthlyView rows={rows} />}
                {tab === 'responsables' && <ResponsibleView rows={rows} />}
                {tab === 'categorias' && <CategoryView rows={rows} />}
                {tab === 'pendientes' &&
                  (pendingList.length === 0 ? (
                    <p className="p-5 text-sm text-muted sm:p-6">No hay incidencias abiertas en el periodo.</p>
                  ) : (
                    <>
                      <PendingView info={pendingPage} list={pendingList} />
                      <Pager info={pendingPage} label="pendientes" {...pagerProps} />
                    </>
                  ))}
              </Card>
            )}
          </div>

          {rows.some(isOverdue) && tab !== 'pendientes' && (
            <p className="text-sm text-muted print:hidden">
              Hay {pluralize(rows.filter(isOverdue).length, 'incidencia vencida', 'incidencias vencidas')}: revísalas en{' '}
              <button className="font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400" onClick={() => setTab('pendientes')} type="button">
                Pendientes y vencidas
              </button>
              .
            </p>
          )}
        </>
      )}
    </div>
  )
}

export default ReportsPage
