import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { useIncidentSession } from '../store/incidentSession'
import type { Closure, IncidentPriority, IncidentStatus } from '../types/incident'

interface ClosureFormValues {
  observations: string
  confirmation: boolean
}

const initialFormValues: ClosureFormValues = {
  observations: '',
  confirmation: false,
}

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

const fieldClassName =
  'mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500'

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm leading-6 text-slate-800">{value}</dd>
    </div>
  )
}

function IncidentClosurePage() {
  const { id } = useParams()
  const { incidents, recordClosure } = useIncidentSession()
  const [values, setValues] = useState(initialFormValues)
  const [confirmationError, setConfirmationError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
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

  const incidentId = incident.id
  const canCloseIncident = incident.status === 'Resuelto' && !incident.closure
  const isClosed = incident.status === 'Cerrado' && Boolean(incident.closure)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canCloseIncident) return

    if (!values.confirmation) {
      setConfirmationError('Confirma que la información es suficiente para cerrar.')
      setSuccessMessage('')
      return
    }

    const closure: Closure = {
      closureObservations: values.observations.trim(),
      closedAt: new Date().toISOString(),
      closedBy: 'Usuario de prueba',
    }
    if (!recordClosure(incidentId, closure)) {
      setSuccessMessage('La incidencia ya no puede cerrarse desde su estado actual.')
      return
    }

    setValues(initialFormValues)
    setConfirmationError('')
    setSuccessMessage('La incidencia fue cerrada correctamente.')
  }

  const formDisabled = !canCloseIncident

  return (
    <section className="mx-auto w-full max-w-5xl">
      <Link
        className="inline-flex rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        to={`/incidencias/${encodeURIComponent(incident.id)}`}
      >
        Volver a detalle
      </Link>

      <header className="mt-5 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-800">{incident.code}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {incident.title}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
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
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">
            Resumen de la incidencia
          </h2>
          <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-5">
            <DetailItem label="Categoría" value={incident.category} />
            <DetailItem label="Responsable" value={incident.responsible} />
            <DetailItem label="Estado" value={incident.status} />
            <DetailItem label="Prioridad" value={incident.priority} />
            <DetailItem
              label="Última actualización"
              value={dateTimeFormatter.format(new Date(incident.updatedAt))}
            />
          </dl>
        </section>

        {incident.resolution && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
            <h2 className="text-base font-semibold text-slate-900">
              Resumen de resolución
            </h2>
            <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <DetailItem
                label="Resumen"
                value={incident.resolution.summary}
              />
              <DetailItem
                label="Acciones realizadas"
                value={incident.resolution.actionsTaken}
              />
              <DetailItem label="Resultado" value={incident.resolution.result} />
              <DetailItem
                label="Observaciones"
                value={incident.resolution.observations || 'Sin observaciones'}
              />
              <DetailItem
                label="Fecha de resolución"
                    value={incident.resolution.resolutionDate
                  ? dateFormatter.format(
                      new Date(`${incident.resolution.resolutionDate}T00:00:00Z`),
                    )
                  : 'Sin información'}
              />
              <DetailItem label="Responsable" value={incident.responsible} />
            </dl>
          </section>
        )}

        {!canCloseIncident && !isClosed && (
          <p
            className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 lg:col-span-2"
            role="status"
          >
            La incidencia debe estar en estado Resuelto para poder cerrarse.
          </p>
        )}

        <form
          className="rounded-lg border border-slate-200 bg-white shadow-sm lg:col-span-2"
          noValidate
          onSubmit={handleSubmit}
        >
          <fieldset
            className="space-y-5 p-5 sm:p-7 disabled:opacity-60"
            disabled={formDisabled}
          >
            <legend className="px-1 text-lg font-semibold text-slate-900">
              Confirmar cierre
            </legend>

            <div>
              <label
                className="block text-sm font-medium text-slate-700"
                htmlFor="closure-observations"
              >
                Observaciones de cierre
              </label>
              <textarea
                className={`${fieldClassName} min-h-24 resize-y leading-6`}
                id="closure-observations"
                maxLength={1000}
                name="observations"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    observations: event.target.value,
                  }))
                }
                value={values.observations}
              />
            </div>

            <div>
              <div className="flex items-start gap-3">
                <input
                  aria-describedby={
                    confirmationError ? 'closure-confirmation-error' : undefined
                  }
                  aria-invalid={Boolean(confirmationError)}
                  checked={values.confirmation}
                  className="mt-1 size-4 rounded border-slate-300 accent-emerald-800 focus:ring-emerald-700 disabled:cursor-not-allowed"
                  id="closure-confirmation"
                  name="confirmation"
                  onChange={(event) => {
                    setValues((current) => ({
                      ...current,
                      confirmation: event.target.checked,
                    }))
                    setConfirmationError('')
                  }}
                  required
                  type="checkbox"
                />
                <label
                  className="text-sm leading-6 text-slate-700"
                  htmlFor="closure-confirmation"
                >
                  Confirmo que la información de la resolución es suficiente
                  para cerrar esta incidencia.
                </label>
              </div>
              {confirmationError && (
                <p
                  className="mt-2 text-sm text-rose-700"
                  id="closure-confirmation-error"
                >
                  {confirmationError}
                </p>
              )}
            </div>

            <button
              className="inline-flex items-center justify-center rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={formDisabled}
              type="submit"
            >
              Cerrar incidencia
            </button>
          </fieldset>
        </form>

        {successMessage && (
          <p
            aria-live="polite"
            className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900 lg:col-span-2"
            role="status"
          >
            {successMessage}
          </p>
        )}

        {isClosed && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Incidencia cerrada
            </h2>
            <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <DetailItem label="Estado" value="Cerrado" />
              <DetailItem
                label="Fecha de cierre"
                value={dateTimeFormatter.format(
                  new Date(incident.closure?.closedAt ?? incident.updatedAt),
                )}
              />
              <DetailItem
                label="Cerrado por"
                value={incident.closure?.closedBy ?? 'Usuario de prueba'}
              />
              <DetailItem
                label="Observaciones de cierre"
                value={
                  incident.closure?.closureObservations || 'Sin observaciones'
                }
              />
            </dl>
          </section>
        )}

        <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 lg:col-span-2">
          El cierre se almacena temporalmente. La persistencia y autorización
          real se implementarán al conectar el backend.
        </p>
      </div>
    </section>
  )
}

export default IncidentClosurePage