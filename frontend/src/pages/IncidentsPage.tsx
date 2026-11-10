import { ChevronRight, ClipboardList, FilePlus2, FilterX, Search, SearchX } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useCurrentUser } from '../auth/authContext'
import { PriorityBadge, StatusBadge } from '../components/ui/Badge'
import { Button, ButtonLink } from '../components/ui/Button'
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../components/ui/Feedback'
import { controlClass } from '../components/ui/Field'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { formatDate, formatRelative, pluralize } from '../lib/format'
import { isManager } from '../lib/permissions'
import { cn } from '../lib/ui'
import {
  incidentCategories,
  incidentPriorities,
  incidentStatuses,
  type IncidentCategory,
  type IncidentPriority,
  type IncidentStatus,
} from '../types/incident'

const selectClass = cn(controlClass, 'pr-8')

function IncidentsPage() {
  const user = useCurrentUser()
  const load = useCallback(() => api.listIncidents(), [])
  const { data, error, loading, reload } = useAsync(load)
  const [params, setParams] = useSearchParams()

  const search = params.get('q') ?? ''
  const status = (params.get('estado') ?? '') as IncidentStatus | ''
  const priority = (params.get('prioridad') ?? '') as IncidentPriority | ''
  const category = (params.get('categoria') ?? '') as IncidentCategory | ''
  const onlyReassign = params.get('reasignar') === '1'
  const hasFilters = Boolean(search || status || priority || category || onlyReassign)

  function setParam(key: string, value: string) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    return (data ?? []).filter((incident) => {
      const matchesSearch =
        !term ||
        [incident.code, incident.title, incident.location, incident.responsible?.fullName ?? '']
          .some((value) => value.toLocaleLowerCase('es').includes(term))
      return (
        matchesSearch &&
        (!status || incident.status === status) &&
        (!priority || incident.priority === priority) &&
        (!category || incident.category === category) &&
        (!onlyReassign || incident.pendingReassignment)
      )
    })
  }, [data, search, status, priority, category, onlyReassign])

  const title = user.role === 'Estudiante' ? 'Mis incidencias' : 'Incidencias'
  const description = isManager(user.role)
    ? 'Consulta, filtra y gestiona todas las incidencias.'
    : user.role === 'Docente'
      ? 'Incidencias que registraste o que tienes asignadas.'
      : 'Incidencias que registraste y su estado actual.'

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <ButtonLink icon={FilePlus2} to="/incidencias/nueva">
            Registrar incidencia
          </ButtonLink>
        }
        description={description}
        icon={ClipboardList}
        title={title}
      />

      <section
        aria-label="Buscar y filtrar"
        className="grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(14rem,1.6fr)_repeat(3,minmax(9rem,1fr))]"
      >
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="filter-search">
            Buscar
          </label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              className={cn(controlClass, 'pl-9')}
              id="filter-search"
              onChange={(event) => setParam('q', event.target.value)}
              placeholder="Código, título, lugar o responsable…"
              type="search"
              value={search}
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="filter-status">
            Estado
          </label>
          <select className={selectClass} id="filter-status" onChange={(e) => setParam('estado', e.target.value)} value={status}>
            <option value="">Todos</option>
            {incidentStatuses.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="filter-priority">
            Prioridad
          </label>
          <select className={selectClass} id="filter-priority" onChange={(e) => setParam('prioridad', e.target.value)} value={priority}>
            <option value="">Todas</option>
            {incidentPriorities.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="filter-category">
            Categoría
          </label>
          <select className={selectClass} id="filter-category" onChange={(e) => setParam('categoria', e.target.value)} value={category}>
            <option value="">Todas</option>
            {incidentCategories.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </div>
        {isManager(user.role) && (
          <label className="flex items-center gap-2 text-sm text-ink-2 sm:col-span-2 lg:col-span-4">
            <input
              checked={onlyReassign}
              className="size-4 accent-emerald-700"
              onChange={(e) => setParam('reasignar', e.target.checked ? '1' : '')}
              type="checkbox"
            />
            Solo pendientes de reasignación
          </label>
        )}
      </section>

      {loading && !data ? (
        <LoadingState />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={() => reload()} />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p aria-live="polite" className="text-sm font-medium text-muted">
              {pluralize(filtered.length, 'incidencia', 'incidencias')}
              {hasFilters && ` de ${data?.length ?? 0}`}
            </p>
            {hasFilters && (
              <Button icon={FilterX} onClick={() => setParams({}, { replace: true })} size="sm" variant="ghost">
                Limpiar filtros
              </Button>
            )}
          </div>

          {filtered.length === 0 ? (
            hasFilters ? (
              <EmptyState
                description="Prueba con otros términos o quita algunos filtros."
                icon={SearchX}
                title="No hay coincidencias"
              />
            ) : (
              <EmptyState
                action={
                  <ButtonLink icon={FilePlus2} to="/incidencias/nueva">
                    Registrar incidencia
                  </ButtonLink>
                }
                description="Las incidencias que registres aparecerán aquí."
                icon={ClipboardList}
                title="Aún no hay incidencias"
              />
            )
          ) : (
            <>
              {/* Tabla (escritorio) */}
              <div className="hidden overflow-hidden rounded-xl border border-line bg-surface shadow-sm lg:block">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Listado de incidencias</caption>
                  <thead className="bg-surface-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-5 py-3" scope="col">Incidencia</th>
                      <th className="px-4 py-3" scope="col">Categoría</th>
                      <th className="px-4 py-3" scope="col">Prioridad</th>
                      <th className="px-4 py-3" scope="col">Estado</th>
                      <th className="px-4 py-3" scope="col">Responsable</th>
                      <th className="px-4 py-3" scope="col">Actualización</th>
                      <th className="px-4 py-3" scope="col"><span className="sr-only">Abrir</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((incident) => (
                      <tr className="group relative hover:bg-surface-2" key={incident.code}>
                        <td className="max-w-sm px-5 py-3.5">
                          <Link
                            className="after:absolute after:inset-0 focus-visible:outline-none"
                            to={`/incidencias/${encodeURIComponent(incident.code)}`}
                          >
                            <span className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400">{incident.code}</span>
                            <span className="block truncate font-medium text-ink group-hover:underline">{incident.title}</span>
                          </Link>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-ink-2">{incident.category}</td>
                        <td className="px-4 py-3.5"><PriorityBadge priority={incident.priority} /></td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col items-start gap-1">
                            <StatusBadge status={incident.status} />
                            {incident.pendingReassignment && (
                              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Por reasignar</span>
                            )}
                          </div>
                        </td>
                        <td className="max-w-[12rem] truncate px-4 py-3.5 text-ink-2">
                          {incident.responsible?.fullName ?? <span className="text-muted">Sin asignar</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-muted" title={incident.updatedAt}>
                          {formatRelative(incident.updatedAt)}
                        </td>
                        <td className="px-4 py-3.5 text-muted">
                          <ChevronRight aria-hidden="true" className="size-4" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tarjetas (móvil y tablet) */}
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
                {filtered.map((incident) => (
                  <li key={incident.code}>
                    <Link
                      className="block h-full rounded-xl border border-line bg-surface p-4 shadow-sm transition hover:border-emerald-500/50 focus-visible:outline-2 focus-visible:outline-emerald-600"
                      to={`/incidencias/${encodeURIComponent(incident.code)}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{incident.code}</p>
                          <p className="mt-0.5 font-medium text-ink">{incident.title}</p>
                        </div>
                        <ChevronRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <StatusBadge status={incident.status} />
                        <PriorityBadge priority={incident.priority} />
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 text-xs">
                        <div>
                          <dt className="text-muted">Categoría</dt>
                          <dd className="text-ink-2">{incident.category}</dd>
                        </div>
                        <div>
                          <dt className="text-muted">Fecha</dt>
                          <dd className="text-ink-2">{formatDate(incident.incidentDate)}</dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-muted">Responsable</dt>
                          <dd className="truncate text-ink-2">
                            {incident.responsible?.fullName ?? 'Sin asignar'}
                            {incident.pendingReassignment && (
                              <span className="ml-1 font-medium text-amber-700 dark:text-amber-400">· Por reasignar</span>
                            )}
                          </dd>
                        </div>
                      </dl>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default IncidentsPage
