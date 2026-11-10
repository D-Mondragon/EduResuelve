import { useEffect, useRef, useState } from 'react'
import { mockAuditLogs } from '../data/mockAuditLogs'
import {
  auditActions,
  auditModules,
  type AuditAction,
  type AuditLog,
  type AuditModule,
} from '../types/audit'

type ActionFilter = 'Todas' | AuditAction
type ModuleFilter = 'Todos' | AuditModule

const dateTimeFormatter = new Intl.DateTimeFormat('es', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

function AuditDetails({ log }: { log: AuditLog }) {
  const details = [
    { label: 'Fecha y hora', value: dateTimeFormatter.format(new Date(log.timestamp)) },
    { label: 'Usuario', value: `${log.userName} (${log.userId})` },
    { label: 'Acción', value: log.action },
    { label: 'Módulo', value: log.module },
    { label: 'Registro relacionado', value: log.entityId },
    { label: 'Descripción', value: log.description },
  ]

  return (
    <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {details.map((detail) => (
        <div className="min-w-0" key={detail.label}>
          <dt className="text-xs font-medium text-slate-500">{detail.label}</dt>
          <dd className="mt-1 break-words text-sm leading-6 text-slate-800">
            {detail.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function AuditPage() {
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('Todos')
  const [actionFilter, setActionFilter] = useState<ActionFilter>('Todas')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!selectedLog) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedLog(null)
    }

    document.addEventListener('keydown', handleKeyDown)
    closeButtonRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedLog])

  const normalizedSearch = search.trim().toLocaleLowerCase('es')
  const chronologicalLogs = [...mockAuditLogs].sort(
    (first, second) => Date.parse(second.timestamp) - Date.parse(first.timestamp),
  )
  const filteredLogs = chronologicalLogs.filter((log) => {
    const searchableContent = [
      log.userName,
      log.action,
      log.module,
      log.entityId,
      log.description,
    ]
      .join(' ')
      .toLocaleLowerCase('es')
    const matchesSearch =
      normalizedSearch.length === 0 || searchableContent.includes(normalizedSearch)
    const matchesModule =
      moduleFilter === 'Todos' || log.module === moduleFilter
    const matchesAction = actionFilter === 'Todas' || log.action === actionFilter

    return matchesSearch && matchesModule && matchesAction
  })

  const today = new Date().toISOString().slice(0, 10)
  const incidentModules: AuditModule[] = [
    'Incidencias',
    'Seguimiento',
    'Evidencias',
    'Resolución',
    'Cierre',
  ]
  const summaryCards = [
    { label: 'Total de eventos', count: mockAuditLogs.length },
    {
      label: 'Eventos de hoy',
      count: mockAuditLogs.filter((log) => log.timestamp.slice(0, 10) === today)
        .length,
    },
    {
      label: 'Cambios de estado',
      count: mockAuditLogs.filter((log) => log.action === 'Cambio de estado')
        .length,
    },
    {
      label: 'Eventos relacionados con incidencias',
      count: mockAuditLogs.filter(
        (log) => incidentModules.includes(log.module) && log.entityId.startsWith('ER-'),
      ).length,
    },
  ]

  return (
    <section className="mx-auto w-full max-w-7xl space-y-7">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Auditoría
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-700 sm:text-base">
          Registro de actividades y trazabilidad del sistema
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Consulta las acciones realizadas sobre los registros de EduResuelve.
        </p>
      </header>

      <section aria-label="Indicadores de auditoría">
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <li
              className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              key={card.label}
            >
              <p className="text-xs font-medium leading-5 text-slate-600 sm:text-sm">
                {card.label}
              </p>
              <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900">
                {card.count}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-label="Buscar y filtrar registros de auditoría"
        className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1fr)_minmax(13rem,0.65fr)_minmax(13rem,0.65fr)] sm:p-5"
      >
        <div>
          <label
            className="mb-1.5 block text-xs font-medium text-slate-600"
            htmlFor="audit-search"
          >
            Buscar en auditoría
          </label>
          <input
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            id="audit-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Usuario, acción, módulo o registro..."
            type="search"
            value={search}
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-xs font-medium text-slate-600"
            htmlFor="audit-module"
          >
            Módulo
          </label>
          <select
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            id="audit-module"
            onChange={(event) => setModuleFilter(event.target.value as ModuleFilter)}
            value={moduleFilter}
          >
            <option value="Todos">Todos</option>
            {auditModules.map((module) => (
              <option key={module} value={module}>
                {module}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="mb-1.5 block text-xs font-medium text-slate-600"
            htmlFor="audit-action"
          >
            Acción
          </label>
          <select
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            id="audit-action"
            onChange={(event) => setActionFilter(event.target.value as ActionFilter)}
            value={actionFilter}
          >
            <option value="Todas">Todas</option>
            {auditActions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <p aria-live="polite" className="text-sm font-medium text-slate-600">
          {filteredLogs.length}{' '}
          {filteredLogs.length === 1 ? 'registro' : 'registros'}
        </p>
      </div>

      {filteredLogs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm text-slate-600">
          No se encontraron registros de auditoría.
        </p>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <caption className="sr-only">
                  Registro cronológico de actividades
                </caption>
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-3.5" scope="col">Fecha y hora</th>
                    <th className="px-4 py-3.5" scope="col">Usuario</th>
                    <th className="px-4 py-3.5" scope="col">Acción</th>
                    <th className="px-4 py-3.5" scope="col">Módulo</th>
                    <th className="px-4 py-3.5" scope="col">Registro relacionado</th>
                    <th className="px-4 py-3.5" scope="col">Descripción</th>
                    <th className="px-4 py-3.5" scope="col">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => (
                    <tr className="hover:bg-slate-50/70" key={log.id}>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                        <time dateTime={log.timestamp}>
                          {dateTimeFormatter.format(new Date(log.timestamp))}
                        </time>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-800">
                        {log.userName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                        {log.action}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                        {log.module}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-700">
                        {log.entityId}
                      </td>
                      <td className="max-w-xs px-4 py-4 text-slate-600">
                        {log.description}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <button
                          className="rounded px-2 py-1 font-medium text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                          onClick={() => setSelectedLog(log)}
                          type="button"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <ul aria-label="Registros de auditoría" className="space-y-3 md:hidden">
            {filteredLogs.map((log) => (
              <li
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                key={log.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-slate-900">
                      {log.action}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{log.userName}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {log.module}
                  </span>
                </div>
                <p className="mt-3 break-words text-sm leading-6 text-slate-600">
                  {log.description}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <div className="min-w-0 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{log.entityId}</span>
                    <span aria-hidden="true"> · </span>
                    <time dateTime={log.timestamp}>
                      {dateTimeFormatter.format(new Date(log.timestamp))}
                    </time>
                  </div>
                  <button
                    className="rounded px-2 py-1 text-sm font-medium text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                    onClick={() => setSelectedLog(log)}
                    type="button"
                  >
                    Ver detalle
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Cerrar detalle del registro"
            className="absolute inset-0 cursor-default bg-slate-950/40"
            onClick={() => setSelectedLog(null)}
            type="button"
          />
          <section
            aria-labelledby="audit-details-title"
            aria-modal="true"
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl sm:p-6"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  className="text-lg font-semibold text-slate-900"
                  id="audit-details-title"
                >
                  Detalle del registro
                </h2>
                <p className="mt-1 text-sm text-slate-600">{selectedLog.id}</p>
              </div>
              <button
                aria-label="Cerrar detalle del registro"
                className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                onClick={() => setSelectedLog(null)}
                ref={closeButtonRef}
                type="button"
              >
                Cerrar
              </button>
            </div>
            <AuditDetails log={selectedLog} />
          </section>
        </div>
      )}
    </section>
  )
}

export default AuditPage