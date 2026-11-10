import { Link, useParams } from 'react-router'
import { mockUsers } from '../data/mockUsers'
import { useIncidentSession } from '../store/incidentSession'
import type { IncidentPriority, IncidentStatus } from '../types/incident'

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
  dateStyle: 'long',
  timeZone: 'UTC',
})

const dateTimeFormatter = new Intl.DateTimeFormat('es', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm leading-6 text-slate-800">{value}</dd>
    </div>
  )
}

function IncidentDetailPage() {
  const { id } = useParams()
  const { incidents, followUps } = useIncidentSession()
  const incident = incidents.find((item) => item.id === id)

  if (!incident) {
    return (
      <section className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-start justify-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Incidencia no encontrada
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          No encontramos una incidencia con el código solicitado.
        </p>
        <Link
          className="mt-6 inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
          to="/incidencias"
        >
          Volver a incidencias
        </Link>
      </section>
    )
  }

  const responsibleUser = incident.responsibleUserId
    ? mockUsers.find((user) => user.id === incident.responsibleUserId)
    : undefined
  const incidentFollowUps = followUps.filter(
    (entry) => entry.incidentId === incident.id,
  )

  return (
    <section className="mx-auto w-full max-w-7xl">
      <Link
        className="inline-flex rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        to="/incidencias"
      >
        Volver a incidencias
      </Link>

      <header className="mt-5 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            {incident.code}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {incident.title}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${statusStyles[incident.status]}`}
          >
            {incident.status}
          </span>
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${priorityStyles[incident.priority]}`}
          >
            Prioridad {incident.priority}
          </span>
          <Link
            className="inline-flex items-center justify-center rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            to={`/incidencias/${encodeURIComponent(incident.id)}/evidencias`}
          >
            Ver evidencias
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            to={`/incidencias/${encodeURIComponent(incident.id)}/seguimiento`}
          >
            Ver seguimiento
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            to={`/incidencias/${encodeURIComponent(incident.id)}/resolucion`}
          >
            Registrar resolución
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            to={`/incidencias/${encodeURIComponent(incident.id)}/cierre`}
          >
            Cerrar incidencia
          </Link>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">
            Información de la incidencia
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">
            {incident.description}
          </p>
          <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-5 border-t border-slate-100 pt-5 sm:grid-cols-2">
            <DetailItem label="Categoría" value={incident.category} />
            <DetailItem
              label="Fecha del incidente"
              value={dateFormatter.format(new Date(`${incident.incidentDate}T00:00:00Z`))}
            />
            <DetailItem label="Lugar" value={incident.location} />
            <DetailItem
              label="Personas involucradas"
              value={incident.involvedPeople}
            />
          </dl>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">
            Información de gestión
          </h2>
          <dl className="mt-5 grid grid-cols-1 gap-y-5">
            {responsibleUser ? (
              <>
                <DetailItem
                  label="Responsable"
                  value={`${responsibleUser.nombres} ${responsibleUser.apellidos}`}
                />
                <DetailItem label="Rol del responsable" value={responsibleUser.role} />
                <DetailItem
                  label="Correo del responsable"
                  value={responsibleUser.email}
                />
              </>
            ) : incident.responsible ? (
              <DetailItem label="Responsable" value={incident.responsible} />
            ) : null}
            <DetailItem
              label="Fecha de registro"
              value={dateTimeFormatter.format(new Date(incident.registeredAt))}
            />
            <DetailItem
              label="Última actualización"
              value={dateTimeFormatter.format(new Date(incident.updatedAt))}
            />
            <DetailItem label="Observaciones" value={incident.observations} />
          </dl>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">Historial</h2>
          <ol className="mt-5 space-y-5">
            {incidentFollowUps.map((entry, index) => (
              <li className="relative flex gap-4" key={entry.id}>
                <div className="relative flex w-4 shrink-0 justify-center">
                  {index < incidentFollowUps.length - 1 && (
                    <span className="absolute top-3 h-[calc(100%+1.5rem)] w-px bg-slate-200" />
                  )}
                  <span className="relative mt-1.5 size-2.5 rounded-full bg-emerald-700 ring-4 ring-white" />
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span
                      className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[entry.status]}`}
                    >
                      {entry.status}
                    </span>
                    <time
                      className="text-xs text-slate-500"
                      dateTime={`${entry.date}T${entry.time}:00Z`}
                    >
                      {dateTimeFormatter.format(
                        new Date(`${entry.date}T${entry.time}:00Z`),
                      )}
                    </time>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-700">{entry.user}</p>
                  {entry.previousStatus && entry.newStatus && (
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {entry.previousStatus} → {entry.newStatus}
                    </p>
                  )}
                  {entry.reason && (
                    <p className="mt-1 text-sm leading-6 text-slate-800">
                      <span className="font-medium text-slate-700">Motivo: </span>
                      {entry.reason}
                    </p>
                  )}
                  <p className="mt-1 text-sm leading-6 text-slate-600">{entry.observation}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 lg:col-span-2">
          Las acciones de gestión estarán disponibles cuando se implemente el
          backend.
        </p>
      </div>
    </section>
  )
}

export default IncidentDetailPage