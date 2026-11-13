import { CalendarDays, Eye, FileDown, FileSpreadsheet, FilterX, Search, SearchX, ShieldAlert, ShieldCheck, Users } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useCurrentUser } from '../auth/authContext'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { DetailItem, EmptyState, ErrorState, LoadingState, PageHeader, StatCard } from '../components/ui/Feedback'
import { controlClass } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { toCsv } from '../lib/csv'
import { saveBlob } from '../lib/files'
import { formatDateTime, pluralize, todayInLima } from '../lib/format'
import { cn } from '../lib/ui'
import { auditModules, type AuditLog } from '../types/audit'

function limaDate(timestamp: string) {
  return todayInLima(new Date(timestamp))
}

function actionTone(action: string) {
  if (action.startsWith('Intento fallido')) return 'bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-300'
  if (/Desactivación|Anulación|Descarte|Reapertura/.test(action))
    return 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300'
  if (/sesión/.test(action)) return 'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-400/10 dark:text-slate-300'
  return 'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300'
}

function AuditPage() {
  const me = useCurrentUser()
  const load = useCallback(() => api.listAudit(), [])
  const { data, error, loading, reload } = useAsync(load)
  const [search, setSearch] = useState('')
  const [module, setModule] = useState('')
  const [action, setAction] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selected, setSelected] = useState<AuditLog | null>(null)

  const logs = useMemo(() => data ?? [], [data])
  const actions = useMemo(() => Array.from(new Set(logs.map((log) => log.action))).sort(), [logs])
  const hasFilters = Boolean(search || module || action || from || to)

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    return logs.filter((log) => {
      const day = limaDate(log.timestamp)
      return (
        (!term ||
          [log.userName, log.dni ?? '', log.entityId, log.description, log.action].some((value) =>
            value.toLocaleLowerCase('es').includes(term),
          )) &&
        (!module || log.module === module) &&
        (!action || log.action === action) &&
        (!from || day >= from) &&
        (!to || day <= to)
      )
    })
  }, [logs, search, module, action, from, to])

  const today = todayInLima()
  const todayCount = logs.filter((log) => limaDate(log.timestamp) === today).length
  const failedCount = logs.filter((log) => log.action === 'Intento fallido de inicio de sesión').length
  const userChanges = logs.filter((log) => log.module === 'Usuarios').length

  function clearFilters() {
    setSearch('')
    setModule('')
    setAction('')
    setFrom('')
    setTo('')
  }

  function exportCsv() {
    const csv = toCsv(
      ['Fecha y hora (Lima)', 'Usuario', 'DNI', 'Acción', 'Módulo', 'Registro', 'Descripción'],
      filtered.map((log) => [formatDateTime(log.timestamp), log.userName, log.dni, log.action, log.module, log.entityId, log.description]),
    )
    saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `auditoria-eduresuelve-${today}.csv`)
  }

  return (
    <div className="print-landscape space-y-6">
      <PageHeader
        actions={
          <>
            <Button disabled={filtered.length === 0} icon={FileSpreadsheet} onClick={exportCsv} variant="secondary">
              Exportar CSV
            </Button>
            <Button
              disabled={filtered.length === 0}
              icon={FileDown}
              onClick={() => window.print()}
              title="Abre el diálogo de impresión: elige “Guardar como PDF”"
              variant="secondary"
            >
              Exportar PDF
            </Button>
          </>
        }
        description="Registro inalterable de las acciones realizadas en el sistema."
        icon={ShieldCheck}
        title="Auditoría"
      />

      <div className="hidden print:block">
        <p className="text-sm">
          Reporte generado por {me.fullName} el {formatDateTime(new Date().toISOString())} ·{' '}
          {pluralize(filtered.length, 'evento', 'eventos')}
          {hasFilters && ' (con filtros aplicados)'}
        </p>
      </div>

      {loading && !data ? (
        <LoadingState />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={() => reload()} />
      ) : (
        <>
          <section aria-label="Resumen" className="grid grid-cols-2 gap-3 lg:grid-cols-4 print:hidden">
            <StatCard icon={ShieldCheck} label="Eventos registrados" value={logs.length} />
            <StatCard
              icon={CalendarDays}
              label="Eventos de hoy"
              tone="bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300"
              value={todayCount}
            />
            <StatCard
              icon={ShieldAlert}
              label="Intentos fallidos"
              tone="bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300"
              value={failedCount}
            />
            <StatCard
              icon={Users}
              label="Cambios de usuarios"
              tone="bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
              value={userChanges}
            />
          </section>

          <section
            aria-label="Filtros"
            className="grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(14rem,1.5fr)_repeat(4,minmax(8rem,1fr))] print:hidden"
          >
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="audit-search">
                Buscar
              </label>
              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                <input
                  className={cn(controlClass, 'pl-9')}
                  id="audit-search"
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Usuario, DNI, registro…"
                  type="search"
                  value={search}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="audit-module">
                Módulo
              </label>
              <select className={controlClass} id="audit-module" onChange={(e) => setModule(e.target.value)} value={module}>
                <option value="">Todos</option>
                {auditModules.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="audit-action">
                Acción
              </label>
              <select className={controlClass} id="audit-action" onChange={(e) => setAction(e.target.value)} value={action}>
                <option value="">Todas</option>
                {actions.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="audit-from">
                Desde
              </label>
              <input className={controlClass} id="audit-from" max={to || undefined} onChange={(e) => setFrom(e.target.value)} type="date" value={from} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="audit-to">
                Hasta
              </label>
              <input className={controlClass} id="audit-to" min={from || undefined} onChange={(e) => setTo(e.target.value)} type="date" value={to} />
            </div>
          </section>

          <div className="flex items-center justify-between gap-3 print:hidden">
            <p aria-live="polite" className="text-sm font-medium text-muted">
              {pluralize(filtered.length, 'evento', 'eventos')}
            </p>
            {hasFilters && (
              <Button icon={FilterX} onClick={clearFilters} size="sm" variant="ghost">
                Limpiar filtros
              </Button>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyState description="Ajusta los filtros para ver otros eventos." icon={SearchX} title="Sin eventos" />
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-xl border border-line bg-surface shadow-sm lg:block print:block print:border-0 print:shadow-none">
                <table className="w-full text-left text-sm print:text-xs">
                  <caption className="sr-only">Eventos de auditoría</caption>
                  <thead className="bg-surface-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-5 py-3" scope="col">Fecha y hora</th>
                      <th className="px-4 py-3" scope="col">Usuario</th>
                      <th className="px-4 py-3" scope="col">Acción</th>
                      <th className="px-4 py-3" scope="col">Módulo</th>
                      <th className="px-4 py-3" scope="col">Registro</th>
                      <th className="hidden px-4 py-3 print:table-cell" scope="col">Descripción</th>
                      <th className="px-4 py-3 print:hidden" scope="col"><span className="sr-only">Detalle</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((log) => (
                      <tr className="hover:bg-surface-2 print:break-inside-avoid" key={log.id}>
                        <td className="whitespace-nowrap px-5 py-3 text-ink-2">{formatDateTime(log.timestamp)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink">{log.userName}</p>
                          {log.dni && <p className="font-mono text-xs text-muted">{log.dni}</p>}
                        </td>
                        <td className="px-4 py-3"><Badge className={actionTone(log.action)}>{log.action}</Badge></td>
                        <td className="px-4 py-3 text-ink-2">{log.module}</td>
                        <td className="px-4 py-3 font-mono text-xs text-ink-2">{log.entityId}</td>
                        <td className="hidden px-4 py-3 print:table-cell">{log.description}</td>
                        <td className="px-4 py-2 print:hidden">
                          <Button aria-label={`Ver detalle del evento ${log.id}`} icon={Eye} onClick={() => setSelected(log)} size="sm" variant="ghost">
                            Ver
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="space-y-3 lg:hidden print:hidden">
                {filtered.map((log) => (
                  <li key={log.id}>
                    <button
                      className="w-full rounded-xl border border-line bg-surface p-4 text-left shadow-sm hover:border-emerald-500/50"
                      onClick={() => setSelected(log)}
                      type="button"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge className={actionTone(log.action)}>{log.action}</Badge>
                        <span className="text-xs text-muted">{formatDateTime(log.timestamp)}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-ink">{log.userName}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted">{log.description}</p>
                      <p className="mt-1 text-xs text-muted">
                        {log.module} · {log.entityId}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <Modal onClose={() => setSelected(null)} open={selected !== null} title="Detalle del evento">
        {selected && (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailItem label="Fecha y hora">{formatDateTime(selected.timestamp)}</DetailItem>
            <DetailItem label="Usuario">
              {selected.userName}
              {selected.dni && <span className="block font-mono text-xs text-muted">DNI {selected.dni}</span>}
            </DetailItem>
            <DetailItem label="Acción">{selected.action}</DetailItem>
            <DetailItem label="Módulo">{selected.module}</DetailItem>
            <DetailItem label="Registro relacionado">{selected.entityId || '—'}</DetailItem>
            <DetailItem label="ID de evento">#{selected.id}</DetailItem>
            <div className="sm:col-span-2">
              <DetailItem label="Descripción">{selected.description || '—'}</DetailItem>
            </div>
          </dl>
        )}
      </Modal>
    </div>
  )
}

export default AuditPage
