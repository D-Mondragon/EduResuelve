import { useState } from 'react'
import { Link } from 'react-router'
import { useIncidentSession } from '../store/incidentSession'
import type { IncidentPriority, IncidentStatus } from '../types/incident'

const statuses: Array<'Todos' | IncidentStatus> = [
  'Todos',
  'Nuevo',
  'En revisión',
  'Asignado',
  'En atención',
  'Resuelto',
  'Cerrado',
]

const priorities: Array<'Todas' | IncidentPriority> = [
  'Todas',
  'Baja',
  'Media',
  'Alta',
  'Crítica',
]

const statusStyles: Record<IncidentStatus, string> = {
  Nuevo: 'bg-sky-50 text-sky-800',
  'En revisión': 'bg-blue-50 text-blue-800',
  Asignado: 'bg-indigo-50 text-indigo-800',
  'En atención': 'bg-amber-50 text-amber-800',
  Resuelto: 'bg-emerald-50 text-emerald-800',
  Cerrado: 'bg-slate-100 text-slate-700',
  Descartado: 'bg-slate-100 text-slate-600',
}

const priorityStyles: Record<IncidentPriority, string> = {
  Baja: 'bg-slate-100 text-slate-700',
  Media: 'bg-blue-50 text-blue-800',
  Alta: 'bg-orange-50 text-orange-800',
  Crítica: 'bg-rose-50 text-rose-800',
}

const dateFormatter = new Intl.DateTimeFormat('es', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

function IncidentBadge({
  label,
  className,
}: {
  label: string
  className: string
}) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}

function IncidentsPage() {
  const { incidents } = useIncidentSession()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'Todos' | IncidentStatus>(
    'Todos',
  )
  const [priorityFilter, setPriorityFilter] = useState<
    'Todas' | IncidentPriority
  >('Todas')

  const normalizedSearch = search.trim().toLocaleLowerCase('es')
  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      [incident.code, incident.title, incident.category].some((value) =>
        value.toLocaleLowerCase('es').includes(normalizedSearch),
      )
    const matchesStatus =
      statusFilter === 'Todos' || incident.status === statusFilter
    const matchesPriority =
      priorityFilter === 'Todas' || incident.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  const hasActiveFilters =
    normalizedSearch.length > 0 ||
    statusFilter !== 'Todos' ||
    priorityFilter !== 'Todas'
  const resultLabel = hasActiveFilters
    ? `${filteredIncidents.length} ${filteredIncidents.length === 1 ? 'incidencia encontrada' : 'incidencias encontradas'}`
    : `${filteredIncidents.length} incidencias`

  return (
    <section className="mx-auto w-full max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Incidencias
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
            Gestión y seguimiento de incidencias educativas.
          </p>
        </div>
        <Link
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          to="/incidencias/nueva"
        >
          <span aria-hidden="true" className="text-lg leading-none">+</span>
          Nueva incidencia
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1fr)_12rem_12rem]">
        <div>
          <label className="sr-only" htmlFor="incident-search">
            Buscar incidencia
          </label>
          <input
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            id="incident-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar incidencia..."
            type="search"
            value={search}
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-xs font-medium text-slate-600"
            htmlFor="incident-status"
          >
            Estado
          </label>
          <select
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            id="incident-status"
            onChange={(event) =>
              setStatusFilter(event.target.value as 'Todos' | IncidentStatus)
            }
            value={statusFilter}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="mb-1.5 block text-xs font-medium text-slate-600"
            htmlFor="incident-priority"
          >
            Prioridad
          </label>
          <select
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            id="incident-priority"
            onChange={(event) =>
              setPriorityFilter(
                event.target.value as 'Todas' | IncidentPriority,
              )
            }
            value={priorityFilter}
          >
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p aria-live="polite" className="text-sm font-medium text-slate-600">
          {resultLabel}
        </p>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-sm">
            <caption className="sr-only">Listado de incidencias</caption>
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3.5" scope="col">Código</th>
                <th className="px-4 py-3.5" scope="col">Incidencia</th>
                <th className="px-4 py-3.5" scope="col">Categoría</th>
                <th className="px-4 py-3.5" scope="col">Prioridad</th>
                <th className="px-4 py-3.5" scope="col">Estado</th>
                <th className="px-4 py-3.5" scope="col">Fecha</th>
                <th className="px-4 py-3.5" scope="col">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIncidents.map((incident) => (
                <tr className="hover:bg-slate-50/70" key={incident.id}>
                  <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-700">
                    <Link
                      className="hover:text-emerald-800 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                      to={`/incidencias/${encodeURIComponent(incident.code)}`}
                    >
                      {incident.code}
                    </Link>
                  </td>
                  <td className="max-w-xs px-4 py-4 font-medium text-slate-900">
                    {incident.title}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                    {incident.category}
                  </td>
                  <td className="px-4 py-4">
                    <IncidentBadge
                      className={priorityStyles[incident.priority]}
                      label={incident.priority}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <IncidentBadge
                      className={statusStyles[incident.status]}
                      label={incident.status}
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                    <time dateTime={incident.incidentDate}>
                      {dateFormatter.format(
                        new Date(`${incident.incidentDate}T00:00:00Z`),
                      )}
                    </time>
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      className="rounded px-2 py-1 font-medium text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                      to={`/incidencias/${encodeURIComponent(incident.code)}`}
                    >
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredIncidents.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-12 text-center text-sm text-slate-500"
                    colSpan={7}
                  >
                    No se encontraron incidencias con esos criterios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export default IncidentsPage