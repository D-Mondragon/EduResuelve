import {
  AlertTriangle,
  ChartColumnBig,
  CheckCircle2,
  Clock3,
  Database,
  FileDown,
  Gauge,
  Info,
  MessageSquareHeart,
  MinusCircle,
  RefreshCw,
  Timer,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useCurrentUser } from '../auth/authContext'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, ErrorState, LoadingState, PageHeader } from '../components/ui/Feedback'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { formatDateTime } from '../lib/format'
import {
  formatHours,
  formatMs,
  formatPct,
  operationName,
  QUALITY_TARGETS,
  targetState,
  type TargetState,
} from '../lib/quality'
import { cn } from '../lib/ui'
import type { DataQualityCheck, PerfStats, QualityStats } from '../types/quality'

/* -------------------------------------------------------------------------
 * Piezas visuales. El estado siempre lleva ícono + texto (nunca solo color),
 * las barras usan un solo tono y la cifra se imprime al lado.
 * ----------------------------------------------------------------------- */

const stateStyle: Record<TargetState | 'warning' | 'info', { icon: LucideIcon; className: string }> = {
  ok: { icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300' },
  fail: { icon: XCircle, className: 'bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-300' },
  warning: { icon: AlertTriangle, className: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300' },
  info: { icon: Info, className: 'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-400/10 dark:text-slate-300' },
  none: { icon: MinusCircle, className: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-400/10 dark:text-slate-300' },
}

function StatusPill({ state, label }: { state: keyof typeof stateStyle; label?: string }) {
  const { icon: Icon, className } = stateStyle[state]
  const text = label ?? (state === 'ok' ? 'Cumple' : state === 'fail' ? 'No cumple' : state === 'none' ? 'Sin datos' : '')
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', className)}>
      <Icon aria-hidden="true" className="size-3.5" />
      {text}
    </span>
  )
}

/** Barra de avance 0–100 con la cifra al lado. */
function Meter({ value, label }: { value: number | null; label: string }) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value))
  if (value === null) {
    return (
      <div className="flex min-w-32 items-center gap-2">
        <span aria-hidden="true" className="h-2 flex-1 rounded-full bg-surface-2" />
        <span className="w-14 text-right text-sm text-muted">
          <span aria-hidden="true">—</span>
          <span className="sr-only">{label}: sin datos</span>
        </span>
      </div>
    )
  }
  return (
    <div className="flex min-w-32 items-center gap-2">
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={value}
        aria-valuetext={formatPct(value)}
        className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"
        role="meter"
      >
        <div className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-14 text-right text-sm tabular-nums text-ink">{formatPct(value)}</span>
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
  target,
  state,
}: {
  icon: LucideIcon
  label: string
  value: string
  detail: string
  target: string
  state: TargetState
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-ink-2">
          <Icon aria-hidden="true" className="size-4 text-emerald-700 dark:text-emerald-400" />
          {label}
        </span>
        <StatusPill state={state} />
      </div>
      <p className="text-3xl font-semibold tabular-nums tracking-tight text-ink">{value}</p>
      <p className="text-xs leading-5 text-muted">
        {detail}
        <span className="block">Meta: {target}</span>
      </p>
    </div>
  )
}

function Table({ caption, head, children }: { caption: string; head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            {head.map((h) => (
              <th className="px-4 py-2.5 font-medium first:pl-5 sm:first:pl-6" key={h} scope="col">
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

const td = 'px-4 py-3 align-middle text-ink first:pl-5 sm:first:pl-6'

function CodeLinks({ codes, more }: { codes: string[]; more?: number }) {
  if (codes.length === 0) return <span className="text-muted">—</span>
  return (
    <span className="flex flex-wrap gap-1.5">
      {codes.map((code) => (
        <Link
          className="inline-flex min-h-6 items-center rounded px-0.5 font-mono text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          key={code}
          to={`/incidencias/${encodeURIComponent(code)}`}
        >
          {code}
        </Link>
      ))}
      {more !== undefined && more > codes.length && <span className="text-xs text-muted">y {more - codes.length} más</span>}
    </span>
  )
}

/* ------------------------------- Secciones ------------------------------ */

function ResolutionSection({ data }: { data: QualityStats['resolution'] }) {
  return (
    <Card label="Tiempos de resolución por prioridad">
      <CardHeader
        description="Desde el registro hasta la resolución (y el cierre). Los casos reabiertos cuentan desde su registro original."
        icon={Clock3}
        title="Tiempos de resolución por prioridad"
      />
      <Table
        caption="Tiempos de resolución por prioridad frente a su meta"
        head={['Prioridad', 'Meta', 'Resueltas', 'Promedio', 'Mediana', 'Dentro de la meta', 'Hasta el cierre', 'Abiertas vencidas']}
      >
        {data.byPriority.map((row) => (
          <tr key={row.priority}>
            <td className={cn(td, 'font-medium')}>{row.priority}</td>
            <td className={cn(td, 'whitespace-nowrap')}>≤ {formatHours(row.targetHours)}</td>
            <td className={cn(td, 'tabular-nums')}>{row.resolved}</td>
            <td className={cn(td, 'whitespace-nowrap tabular-nums')}>{formatHours(row.avgHoursToResolve)}</td>
            <td className={cn(td, 'whitespace-nowrap tabular-nums')}>{formatHours(row.medianHoursToResolve)}</td>
            <td className={td}>
              <Meter label={`${row.priority}: dentro de la meta`} value={row.withinTargetPct} />
            </td>
            <td className={cn(td, 'whitespace-nowrap tabular-nums')}>
              {formatHours(row.avgHoursToClose)}
              {row.closed > 0 && <span className="block text-xs text-muted">mediana {formatHours(row.medianHoursToClose)}</span>}
            </td>
            <td className={td}>
              {row.overdueOpen > 0 ? (
                <span className="flex flex-col gap-1">
                  <StatusPill label={`${row.overdueOpen} de ${row.open}`} state="warning" />
                  <CodeLinks codes={row.overdueCodes.slice(0, 5)} more={row.overdueCodes.length} />
                </span>
              ) : (
                <span className="text-muted">{row.open > 0 ? `0 de ${row.open}` : '—'}</span>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </Card>
  )
}

function SatisfactionSection({ data }: { data: QualityStats['satisfaction'] }) {
  const max = Math.max(1, ...data.ratingDistribution.map((d) => d.count))
  const total = data.responses
  const answered = data.responses + data.pending
  return (
    <Card label="Satisfacción con la atención">
      <CardHeader
        description="Encuestas respondidas por quien registró la incidencia tras el cierre (RN-012)."
        icon={MessageSquareHeart}
        title="Satisfacción con la atención"
      />
      {total === 0 ? (
        <p className="p-5 text-sm text-muted sm:p-6">
          Aún no hay encuestas respondidas{data.pending > 0 ? ` (${data.pending} pendiente${data.pending === 1 ? '' : 's'})` : ''}.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-3">
          <dl className="space-y-3">
            {[
              ['Respuestas', `${total} de ${answered} (${formatPct(answered ? (100 * total) / answered : null)})`],
              ['Satisfacción promedio', data.avgRating === null ? '—' : `${data.avgRating.toLocaleString('es-PE')} / 5`],
              ['Rapidez promedio', data.avgSpeed === null ? '—' : `${data.avgSpeed.toLocaleString('es-PE')} / 5`],
              ['Con alerta (≤ 2 o no resuelto)', String(data.lowCount)],
            ].map(([k, v]) => (
              <div className="flex justify-between gap-3 text-sm" key={k}>
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium tabular-nums text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <div>
            <h3 className="text-sm font-medium text-ink-2">Calificación general</h3>
            <ul className="mt-3 space-y-2">
              {[...data.ratingDistribution].reverse().map((d) => (
                <li className="flex items-center gap-2 text-sm" key={d.rating}>
                  <span className="w-16 text-muted">{d.rating} {d.rating === 1 ? 'estrella' : 'estrellas'}</span>
                  <span aria-hidden="true" className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full bg-emerald-600 dark:bg-emerald-500" style={{ width: `${(d.count / max) * 100}%` }} />
                  </span>
                  <span className="w-6 text-right tabular-nums text-ink">{d.count}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink-2">¿Se resolvió el problema?</h3>
            <ul className="mt-3 space-y-2">
              {(['Sí', 'Parcialmente', 'No'] as const).map((k) => (
                <li className="flex items-center gap-2 text-sm" key={k}>
                  <span className="w-24 text-muted">{k}</span>
                  <span className="flex-1">
                    <Meter label={`Respuestas "${k}"`} value={total ? Math.round((1000 * data.resolved[k]) / total) / 10 : null} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  )
}

const periods = [7, 30, 90] as const

function PerformanceSection({
  data,
  days,
  onDays,
}: {
  data: PerfStats | undefined
  days: number
  onDays: (days: number) => void
}) {
  return (
    <Card label="Tiempos de respuesta del sistema">
      <CardHeader
        action={
          <div aria-label="Periodo" className="flex rounded-lg border border-line p-0.5 print:hidden" role="group">
            {periods.map((p) => (
              <button
                aria-pressed={days === p}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium',
                  days === p ? 'bg-emerald-700 text-white' : 'text-ink-2 hover:bg-surface-2',
                )}
                key={p}
                onClick={() => onDays(p)}
                type="button"
              >
                {p} días
              </button>
            ))}
          </div>
        }
        description="Medidos en el navegador de cada persona: lo que realmente espera. Anónimos (RNF-001)."
        icon={Timer}
        title="Tiempos de respuesta del sistema"
      />
      {!data ? (
        <LoadingState />
      ) : data.overall.count === 0 ? (
        <p className="p-5 text-sm text-muted sm:p-6">Aún no hay mediciones en los últimos {data.days} días.</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-4 border-b border-line p-5 sm:grid-cols-4 sm:p-6">
            {[
              ['Mediciones', data.overall.count.toLocaleString('es-PE')],
              ['Mediana', formatMs(data.overall.p50Ms)],
              ['Percentil 95', formatMs(data.overall.p95Ms)],
              ['Con error', formatPct(data.overall.errorPct)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-wide text-muted">{k}</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <Table
            caption="Tiempos de respuesta por operación"
            head={['Operación', 'Mediciones', 'Mediana', 'Percentil 95', 'Máximo', `En menos de ${data.thresholdMs / 1000} s`]}
          >
            {data.byOperation.map((op) => (
              <tr key={op.operation}>
                <td className={cn(td, 'font-medium')}>{operationName(op.operation)}</td>
                <td className={cn(td, 'tabular-nums')}>{op.count}</td>
                <td className={cn(td, 'whitespace-nowrap tabular-nums')}>{formatMs(op.p50Ms)}</td>
                <td className={cn(td, 'whitespace-nowrap tabular-nums')}>{formatMs(op.p95Ms)}</td>
                <td className={cn(td, 'whitespace-nowrap tabular-nums')}>{formatMs(op.maxMs)}</td>
                <td className={td}>
                  <Meter label={`${operationName(op.operation)}: en menos de 3 s`} value={op.underThresholdPct} />
                </td>
              </tr>
            ))}
          </Table>
          {data.byDevice.length > 0 && (
            <p className="border-t border-line px-5 py-3 text-sm text-muted sm:px-6">
              {data.byDevice
                .map((d) => `${d.device}: ${d.count} mediciones, percentil 95 ${formatMs(d.p95Ms)}, ${formatPct(d.underThresholdPct)} en menos de 3 s`)
                .join(' · ')}
            </p>
          )}
        </>
      )}
    </Card>
  )
}

function checkState(check: DataQualityCheck): keyof typeof stateStyle {
  if (check.affected === 0) return 'ok'
  return check.severity === 'error' ? 'fail' : check.severity === 'warning' ? 'warning' : 'info'
}

function DataQualitySection({ data }: { data: QualityStats['dataQuality'] }) {
  return (
    <Card label="Calidad de los datos">
      <CardHeader
        description="Controles automáticos sobre los registros: integridad, consistencia, unicidad, actualización y completitud."
        icon={Database}
        title="Calidad de los datos"
      />
      <Table caption="Controles de calidad de datos" head={['Dimensión', 'Control', 'Registros correctos', 'Estado', 'Casos a revisar']}>
        {data.checks.map((c) => {
          const state = checkState(c)
          return (
            <tr key={c.check}>
              <td className={cn(td, 'whitespace-nowrap text-ink-2')}>{c.dimension}</td>
              <td className={cn(td, 'font-medium')}>{c.check}</td>
              <td className={td}>
                <Meter label={`${c.check}: registros correctos`} value={c.okPct} />
                <span className="text-xs text-muted">
                  {c.total - c.affected} de {c.total}
                </span>
              </td>
              <td className={td}>
                <StatusPill
                  label={state === 'ok' ? 'Correcto' : state === 'fail' ? 'Error' : state === 'warning' ? 'Revisar' : 'Informativo'}
                  state={state}
                />
              </td>
              <td className={td}>
                <CodeLinks codes={c.codes} more={c.affected} />
              </td>
            </tr>
          )
        })}
      </Table>
    </Card>
  )
}

/* --------------------------------- Página -------------------------------- */

function QualityPage() {
  const user = useCurrentUser()
  const [days, setDays] = useState(30)
  const loadQuality = useCallback(() => api.qualityStats(), [])
  const loadPerf = useCallback(() => api.perfStats(days), [days])
  const quality = useAsync(loadQuality)
  const perf = useAsync(loadPerf)

  const q = quality.data
  const p = perf.data
  const resolutionPct = q?.resolution.withinTargetPct ?? null
  const csat = q?.satisfaction.csatPct ?? null
  const under = p && p.overall.count > 0 ? p.overall.underThresholdPct : null
  const dq = q?.dataQuality.score ?? null

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button
              icon={RefreshCw}
              onClick={() => {
                quality.reload(true)
                perf.reload(true)
              }}
              variant="secondary"
            >
              Actualizar
            </Button>
            <Button disabled={!q} icon={FileDown} onClick={() => window.print()} title="Abre el diálogo de impresión: elige “Guardar como PDF”" variant="secondary">
              Exportar PDF
            </Button>
          </>
        }
        description="Indicadores del servicio frente a sus metas: oportunidad, satisfacción, rendimiento y calidad de datos."
        icon={ChartColumnBig}
        title="Panel de calidad"
      />

      {q && (
        <p className="text-sm text-muted">
          Calculado el {formatDateTime(q.generatedAt)} sobre {q.totals.incidents} incidencias ({q.totals.open} abiertas,{' '}
          {q.totals.resolved} resueltas, {q.totals.closed} cerradas, {q.totals.discarded} descartadas)
          <span className="hidden print:inline"> · Reporte generado por {user.fullName}</span>.
        </p>
      )}

      {quality.loading && !q ? (
        <LoadingState label="Calculando indicadores…" />
      ) : quality.error && !q ? (
        <ErrorState error={quality.error} onRetry={() => quality.reload()} />
      ) : q ? (
        <>
          <section aria-label="Indicadores principales" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              detail="Incidencias resueltas dentro de la meta de su prioridad"
              icon={Clock3}
              label="Oportunidad"
              state={targetState(resolutionPct, QUALITY_TARGETS.resolutionWithinTargetPct)}
              target={`≥ ${QUALITY_TARGETS.resolutionWithinTargetPct} %`}
              value={formatPct(resolutionPct)}
            />
            <KpiCard
              detail={`Encuestas con 4 o 5 estrellas (${q.satisfaction.responses} respuestas)`}
              icon={MessageSquareHeart}
              label="Satisfacción (CSAT)"
              state={targetState(csat, QUALITY_TARGETS.csatPct)}
              target={`≥ ${QUALITY_TARGETS.csatPct} %`}
              value={formatPct(csat)}
            />
            <KpiCard
              detail={p ? `Operaciones en menos de 3 s, últimos ${p.days} días` : 'Cargando mediciones…'}
              icon={Gauge}
              label="Rendimiento"
              state={targetState(under, QUALITY_TARGETS.underThresholdPct)}
              target={`≥ ${QUALITY_TARGETS.underThresholdPct} % en menos de 3 s`}
              value={formatPct(under)}
            />
            <KpiCard
              detail="Promedio de los controles de integridad, consistencia, unicidad y actualización"
              icon={Database}
              label="Calidad de datos"
              state={targetState(dq, QUALITY_TARGETS.dataQualityScore)}
              target={`≥ ${QUALITY_TARGETS.dataQualityScore} %`}
              value={formatPct(dq)}
            />
          </section>

          <ResolutionSection data={q.resolution} />
          <SatisfactionSection data={q.satisfaction} />
          {perf.error && !p ? (
            <ErrorState error={perf.error} onRetry={() => perf.reload()} />
          ) : (
            <PerformanceSection data={p} days={days} onDays={setDays} />
          )}
          <DataQualitySection data={q.dataQuality} />

          <p className="text-xs leading-5 text-muted">
            Metas de resolución por prioridad: Crítica ≤ 24 h, Alta ≤ 3 días, Media ≤ 7 días, Baja ≤ 15 días. Los
            indicadores se calculan en el momento con los datos registrados; las mediciones de rendimiento se conservan 90
            días.
          </p>
        </>
      ) : null}
    </div>
  )
}

export default QualityPage
