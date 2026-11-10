import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { useIncidentSession } from '../store/incidentSession'
import type {
  IncidentPriority,
  IncidentStatus,
  Resolution,
} from '../types/incident'

interface ResolutionFormValues {
  summary: string
  actions: string
  outcome: string
  observations: string
  resolutionDate: string
}

type ResolutionFormErrors = Partial<Record<keyof ResolutionFormValues, string>>

const initialFormValues: ResolutionFormValues = {
  summary: '',
  actions: '',
  outcome: '',
  observations: '',
  resolutionDate: '',
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

const dateTimeFormatter = new Intl.DateTimeFormat('es', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

const dateFormatter = new Intl.DateTimeFormat('es', {
  dateStyle: 'long',
  timeZone: 'UTC',
})

const fieldClassName =
  'mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500'

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null

  return (
    <p className="mt-1.5 text-sm text-rose-700" id={id}>
      {message}
    </p>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm leading-6 text-slate-800">{value}</dd>
    </div>
  )
}

function IncidentResolutionPage() {
  const { id } = useParams()
  const { incidents, recordResolution } = useIncidentSession()
  const [values, setValues] = useState(initialFormValues)
  const [errors, setErrors] = useState<ResolutionFormErrors>({})
  const [confirmation, setConfirmation] = useState('')
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
  const canRegisterResolution =
    incident.status === 'En atención' && !incident.resolution

  function updateField<Field extends keyof ResolutionFormValues>(
    field: Field,
    value: ResolutionFormValues[Field],
  ) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setConfirmation('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canRegisterResolution) return

    const nextErrors: ResolutionFormErrors = {}
    if (!values.summary.trim()) {
      nextErrors.summary = 'Ingresa un resumen de la resolución.'
    }
    if (!values.actions.trim()) {
      nextErrors.actions = 'Describe las acciones realizadas.'
    }
    if (!values.outcome.trim()) {
      nextErrors.outcome = 'Describe el resultado de la atención.'
    }
    if (!values.resolutionDate) {
      nextErrors.resolutionDate = 'Selecciona la fecha de resolución.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const resolution: Resolution = {
      summary: values.summary.trim(),
      actionsTaken: values.actions.trim(),
      result: values.outcome.trim(),
      observations: values.observations.trim(),
      resolutionDate: values.resolutionDate,
      registeredBy: 'Usuario de prueba',
    }

    if (!recordResolution(incidentId, resolution)) {
      setConfirmation('La incidencia ya no puede pasar a Resuelto desde su estado actual.')
      return
    }

    setValues(initialFormValues)
    setErrors({})
    setConfirmation('La resolución se registró temporalmente en esta pantalla.')
  }

  const registeredResolution = incident.resolution
  const formDisabled = !canRegisterResolution

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

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">
          Resumen de la incidencia
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {incident.description}
        </p>
        <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-5">
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

      {!canRegisterResolution && !registeredResolution && (
        <p
          className="mt-6 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"
          role="status"
        >
          La resolución estará disponible cuando la incidencia se encuentre en
          estado En atención.
        </p>
      )}

      <form
        className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm"
        noValidate
        onSubmit={handleSubmit}
      >
        <fieldset
          className="grid grid-cols-1 gap-x-6 gap-y-5 p-5 sm:p-7 md:grid-cols-2 disabled:opacity-60"
          disabled={formDisabled}
        >
          <legend className="px-1 text-lg font-semibold text-slate-900">
            Registrar resolución
          </legend>

          <div className="md:col-span-2">
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="resolution-summary"
            >
              Resumen de la resolución <span className="text-rose-700">*</span>
            </label>
            <textarea
              aria-describedby={errors.summary ? 'resolution-summary-error' : undefined}
              aria-invalid={Boolean(errors.summary)}
              className={`${fieldClassName} min-h-24 resize-y leading-6`}
              id="resolution-summary"
              maxLength={1000}
              name="summary"
              onChange={(event) => updateField('summary', event.target.value)}
              required
              value={values.summary}
            />
            <FieldError id="resolution-summary-error" message={errors.summary} />
          </div>

          <div className="md:col-span-2">
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="resolution-actions"
            >
              Acciones realizadas <span className="text-rose-700">*</span>
            </label>
            <textarea
              aria-describedby={errors.actions ? 'resolution-actions-error' : undefined}
              aria-invalid={Boolean(errors.actions)}
              className={`${fieldClassName} min-h-28 resize-y leading-6`}
              id="resolution-actions"
              maxLength={2000}
              name="actions"
              onChange={(event) => updateField('actions', event.target.value)}
              required
              value={values.actions}
            />
            <FieldError id="resolution-actions-error" message={errors.actions} />
          </div>

          <div className="md:col-span-2">
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="resolution-outcome"
            >
              Resultado de la atención <span className="text-rose-700">*</span>
            </label>
            <textarea
              aria-describedby={errors.outcome ? 'resolution-outcome-error' : undefined}
              aria-invalid={Boolean(errors.outcome)}
              className={`${fieldClassName} min-h-24 resize-y leading-6`}
              id="resolution-outcome"
              maxLength={2000}
              name="outcome"
              onChange={(event) => updateField('outcome', event.target.value)}
              required
              value={values.outcome}
            />
            <FieldError id="resolution-outcome-error" message={errors.outcome} />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="resolution-date"
            >
              Fecha de resolución <span className="text-rose-700">*</span>
            </label>
            <input
              aria-describedby={
                errors.resolutionDate ? 'resolution-date-error' : undefined
              }
              aria-invalid={Boolean(errors.resolutionDate)}
              className={fieldClassName}
              id="resolution-date"
              name="resolutionDate"
              onChange={(event) =>
                updateField('resolutionDate', event.target.value)
              }
              required
              type="date"
              value={values.resolutionDate}
            />
            <FieldError
              id="resolution-date-error"
              message={errors.resolutionDate}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="resolution-observations"
            >
              Observaciones finales
            </label>
            <textarea
              className={`${fieldClassName} min-h-24 resize-y leading-6`}
              id="resolution-observations"
              maxLength={1000}
              name="observations"
              onChange={(event) =>
                updateField('observations', event.target.value)
              }
              value={values.observations}
            />
          </div>

          <div className="md:col-span-2">
            <button
              className="inline-flex items-center justify-center rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={formDisabled}
              type="submit"
            >
              Registrar resolución
            </button>
          </div>
        </fieldset>
      </form>

      {confirmation && (
        <p
          aria-live="polite"
          className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900"
          role="status"
        >
          {confirmation} Los datos son temporales y se perderán al recargar.
        </p>
      )}

      {registeredResolution && (
        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Resolución registrada
          </h2>
          <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <DetailItem label="Resumen" value={registeredResolution.summary} />
            <DetailItem
              label="Acciones realizadas"
              value={registeredResolution.actionsTaken}
            />
            <DetailItem label="Resultado" value={registeredResolution.result} />
            <DetailItem
              label="Observaciones"
              value={registeredResolution.observations || 'Sin observaciones'}
            />
            <DetailItem
              label="Fecha de resolución"
              value={dateFormatter.format(
                new Date(`${registeredResolution.resolutionDate}T00:00:00Z`),
              )}
            />
            <DetailItem
              label="Registrada por"
              value={registeredResolution.registeredBy}
            />
          </dl>
          <p className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            Esta resolución solo existe temporalmente en esta pantalla y se
            perderá al recargar.
          </p>
        </section>
      )}
    </section>
  )
}

export default IncidentResolutionPage