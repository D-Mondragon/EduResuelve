import { Link } from 'react-router'
import { useIncidentSession } from '../store/incidentSession'
import type {
  IncidentCategory,
  IncidentPriority,
  IncidentStatus,
} from '../types/incident'

const incidentStatuses: IncidentStatus[] = [
  'Nuevo',
  'En revisión',
  'Asignado',
  'En atención',
  'Resuelto',
  'Cerrado',
  'Descartado',
]

const incidentPriorities: IncidentPriority[] = ['Baja', 'Media', 'Alta', 'Crítica']

const incidentCategories: IncidentCategory[] = [
  'Convivencia',
  'Académica',
  'Infraestructura',
  'Orientación',
  'Administrativa',
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

const dateTimeFormatter = new Intl.DateTimeFormat('es', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

interface DistributionItem {
  label: string
  count: number
  className: string
}

function DistributionSection({
  title,
  items,
}: {
  title: string
  items: DistributionItem[]
}) {
  const maximum = Math.max(0, ...items.map((item) => item.count))

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <ul className="mt-5 space-y-4">
        {items.map((item) => {
          const percentage = maximum > 0 ? (item.count / maximum) * 100 : 0

          return (
            <li key={item.label}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-slate-700">
                  {item.label}
                </span>
                <span className="shrink-0 font-medium tabular-nums text-slate-900">
                  {item.count}
                </span>
              </div>
              <div
                aria-label={`${item.label}: ${item.count}`}
                aria-valuemax={Math.max(maximum, 1)}
                aria-valuemin={0}
                aria-valuenow={item.count}
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
                role="meter"
              >
                <div
                  className={`h-full rounded-full ${item.className}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function DashboardPage() {
  const { incidents } = useIncidentSession()
  const totalIncidents = incidents.length
  const countByStatus = (status: IncidentStatus) =>
    incidents.filter((incident) => incident.status === status).length

  const statusCounts = incidentStatuses.map((status) => ({
    label: status,
    count: countByStatus(status),
    className: statusStyles[status].split(' ')[0],
  }))

  const priorityCounts = incidentPriorities.map((priority) => ({
    label: priority,
    count: incidents.filter((incident) => incident.priority === priority)
      .length,
    className: priorityStyles[priority].split(' ')[0],
  }))

  const categoryCounts = incidentCategories.map((category) => ({
    label: category,
    count: incidents.filter((incident) => incident.category === category)
      .length,
    className: 'bg-emerald-700',
  }))

  const summaryCards = [
    { label: 'Total de incidencias', count: totalIncidents },
    { label: 'En revisión', count: countByStatus('En revisión') },
    { label: 'Asignadas', count: countByStatus('Asignado') },
    { label: 'En atención', count: countByStatus('En atención') },
    { label: 'Resueltas', count: countByStatus('Resuelto') },
    { label: 'Cerradas', count: countByStatus('Cerrado') },
  ]

  const recentIncidents = [...incidents]
    .sort(
      (first, second) =>
        Date.parse(second.updatedAt) - Date.parse(first.updatedAt),
    )
    .slice(0, 5)

  return (
    <section className="mx-auto w-full max-w-7xl space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
            Resumen general de incidencias
          </p>
        </div>
        <nav aria-label="Accesos rápidos" className="flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center justify-center rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            to="/incidencias/nueva"
          >
            Registrar nueva incidencia
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            to="/incidencias"
          >
            Ver todas las incidencias
          </Link>
        </nav>
      </header>

      <section aria-label="Indicadores principales">
        <h2 className="sr-only">Indicadores principales</h2>
        {totalIncidents === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-600">
            No hay incidencias registradas.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
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
        )}
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        <DistributionSection
          items={statusCounts}
          title="Incidencias por estado"
        />
        <DistributionSection
          items={priorityCounts}
          title="Incidencias por prioridad"
        />
        <DistributionSection
          items={categoryCounts}
          title="Incidencias por categoría"
        />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Incidencias recientes
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Ordenadas por última actualización
            </p>
          </div>
          <Link
            className="w-fit text-sm font-medium text-emerald-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            to="/incidencias"
          >
            Ver todas las incidencias
          </Link>
        </div>
        {recentIncidents.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-600 sm:px-6">
            No hay incidencias registradas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <caption className="sr-only">
                Hasta cinco incidencias actualizadas recientemente
              </caption>
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3.5 sm:px-6" scope="col">Código</th>
                  <th className="px-4 py-3.5" scope="col">Incidencia</th>
                  <th className="px-4 py-3.5" scope="col">Categoría</th>
                  <th className="px-4 py-3.5" scope="col">Prioridad</th>
                  <th className="px-4 py-3.5" scope="col">Estado</th>
                  <th className="px-4 py-3.5" scope="col">Actualización</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentIncidents.map((incident) => (
                  <tr className="hover:bg-slate-50/70" key={incident.id}>
                    <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-800 sm:px-6">
                      <Link
                        aria-label={`Ver detalle de ${incident.code}: ${incident.title}`}
                        className="hover:text-emerald-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                        to={`/incidencias/${encodeURIComponent(incident.id)}`}
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
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${priorityStyles[incident.priority]}`}
                      >
                        {incident.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[incident.status]}`}
                      >
                        {incident.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                      <time dateTime={incident.updatedAt}>
                        {dateTimeFormatter.format(new Date(incident.updatedAt))}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}

export default DashboardPage