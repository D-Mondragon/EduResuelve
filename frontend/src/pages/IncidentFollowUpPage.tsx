import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { mockUsers } from '../data/mockUsers'
import { incidentTransitions, useIncidentSession } from '../store/incidentSession'
import type { IncidentPriority, IncidentStatus } from '../types/incident'
import { incidentResponsibleRoles } from '../types/user'

interface FollowUpFormErrors {
  observation?: string
  reason?: string
  nextStatus?: string
  responsible?: string
}

const assignableUsers = mockUsers.filter(
  (user) =>
    user.status === 'Activo' && incidentResponsibleRoles.includes(user.role),
)

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

function IncidentFollowUpPage() {
  const { id } = useParams()
  const { incidents, followUps, recordFollowUp } = useIncidentSession()
  const [observation, setObservation] = useState('')
  const [reason, setReason] = useState('')
  const [nextStatus, setNextStatus] = useState<IncidentStatus | ''>('')
  const [responsibleUserId, setResponsibleUserId] = useState('')
  const [errors, setErrors] = useState<FollowUpFormErrors>({})
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
  const currentIncidentStatus = incident.status
  const transitions = incidentTransitions[currentIncidentStatus]
  const isDiscarding =
    currentIncidentStatus === 'En revisión' && nextStatus === 'Descartado'
  const isReopening =
    currentIncidentStatus === 'Cerrado' && nextStatus === 'En revisión'
  const requiresReason = isDiscarding || isReopening
  const reasonLabel = isDiscarding
    ? 'Motivo del descarte'
    : 'Motivo de reapertura'
  const reasonErrorMessage = isDiscarding
    ? 'Debe indicar el motivo del descarte.'
    : 'Debe indicar el motivo de la reapertura.'
  const selectedResponsible = assignableUsers.find(
    (user) => user.id === responsibleUserId,
  )
  const incidentFollowUps = followUps.filter(
    (followUp) => followUp.incidentId === incidentId,
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: FollowUpFormErrors = {}
    if (!observation.trim()) {
      nextErrors.observation = 'Escribe una observación para el seguimiento.'
    }
    if (requiresReason && !reason.trim()) {
      nextErrors.reason = reasonErrorMessage
    }
    if (!nextStatus) {
      nextErrors.nextStatus = 'Selecciona el próximo estado.'
    } else if (!transitions.includes(nextStatus)) {
      nextErrors.nextStatus = 'La transición seleccionada no está permitida.'
    }
    if (
      currentIncidentStatus === 'En revisión' &&
      nextStatus === 'Asignado' &&
      !selectedResponsible
    ) {
      nextErrors.responsible =
        'Debe seleccionar un responsable para asignar la incidencia.'
    }

    setErrors(nextErrors)
    setConfirmation('')
    if (Object.keys(nextErrors).length > 0 || !nextStatus) return

    if (
      !recordFollowUp(
        incidentId,
        nextStatus,
        observation,
        nextStatus === 'Asignado' ? responsibleUserId : undefined,
        requiresReason ? reason : undefined,
      )
    ) {
      if (requiresReason) {
        setErrors({ reason: reasonErrorMessage })
      } else if (nextStatus === 'Asignado') {
        setErrors({
          responsible:
            'Debe seleccionar un responsable para asignar la incidencia.',
        })
      } else {
        setErrors({ nextStatus: 'La transición seleccionada no está permitida.' })
      }
      return
    }

    setObservation('')
    setReason('')
    setNextStatus('')
    setResponsibleUserId('')
    setErrors({})
    setConfirmation('El seguimiento se registró temporalmente en esta pantalla.')
  }

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
          Información de gestión
        </h2>
        <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="Responsable" value={incident.responsible} />
          <DetailItem label="Estado actual" value={incident.status} />
          <DetailItem label="Prioridad" value={incident.priority} />
          <DetailItem
            label="Última actualización"
            value={dateTimeFormatter.format(new Date(incident.updatedAt))}
          />
        </dl>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Historial de seguimiento
          </h2>
          <ol className="mt-5 space-y-5">
            {incidentFollowUps.map((followUp, index) => (
              <li className="relative flex gap-4" key={followUp.id}>
                <div className="relative flex w-4 shrink-0 justify-center">
                  {index < incidentFollowUps.length - 1 && (
                    <span className="absolute top-3 h-[calc(100%+1.5rem)] w-px bg-slate-200" />
                  )}
                  <span className="relative mt-1.5 size-2.5 rounded-full bg-emerald-700 ring-4 ring-white" />
                </div>
                <div className="min-w-0 flex-1 pb-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span
                      className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[followUp.status]}`}
                    >
                      {followUp.status}
                    </span>
                    <time
                      className="text-xs text-slate-500"
                      dateTime={`${followUp.date}T${followUp.time}:00Z`}
                    >
                      {dateTimeFormatter.format(
                        new Date(`${followUp.date}T${followUp.time}:00Z`),
                      )}
                    </time>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-700">
                    {followUp.user}
                  </p>
                  {followUp.previousStatus && followUp.newStatus && (
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {followUp.previousStatus} → {followUp.newStatus}
                    </p>
                  )}
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {followUp.reason ? (
                      <>
                        <span className="font-medium text-slate-700">Motivo: </span>
                        {followUp.reason}
                      </>
                    ) : (
                      followUp.observation
                    )}
                  </p>
                  {followUp.responsibleUserId && (
                    <p className="mt-2 text-sm text-slate-600">
                      Responsable asignado:{' '}
                      {mockUsers.find(
                        (user) => user.id === followUp.responsibleUserId,
                      )?.nombres}{' '}
                      {mockUsers.find(
                        (user) => user.id === followUp.responsibleUserId,
                      )?.apellidos}
                    </p>
                  )}
                </div>
              </li>
            ))}
            {incidentFollowUps.length === 0 && (
              <li className="rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                Todavía no hay eventos de seguimiento.
              </li>
            )}
          </ol>
        </section>

        <section className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Agregar seguimiento
          </h2>
          <form className="mt-5 space-y-5" noValidate onSubmit={handleSubmit}>
            <div>
              <label
                className="block text-sm font-medium text-slate-700"
                htmlFor="follow-up-observation"
              >
                Observación <span className="text-rose-700">*</span>
              </label>
              <textarea
                aria-describedby={
                  errors.observation ? 'follow-up-observation-error' : undefined
                }
                aria-invalid={Boolean(errors.observation)}
                className={`${fieldClassName} min-h-28 resize-y leading-6`}
                id="follow-up-observation"
                maxLength={1000}
                name="observation"
                onChange={(event) => {
                  setObservation(event.target.value)
                  setErrors((current) => ({
                    ...current,
                    observation: undefined,
                  }))
                  setConfirmation('')
                }}
                required
                value={observation}
              />
              {errors.observation && (
                <p
                  className="mt-1.5 text-sm text-rose-700"
                  id="follow-up-observation-error"
                >
                  {errors.observation}
                </p>
              )}
            </div>

            {requiresReason && (
              <div>
                <label
                  className="block text-sm font-medium text-slate-700"
                  htmlFor="follow-up-reason"
                >
                  {reasonLabel} <span className="text-rose-700">*</span>
                </label>
                <textarea
                  aria-describedby={
                    errors.reason ? 'follow-up-reason-error' : undefined
                  }
                  aria-invalid={Boolean(errors.reason)}
                  className={`${fieldClassName} min-h-24 resize-y leading-6`}
                  id="follow-up-reason"
                  maxLength={1000}
                  name="reason"
                  onChange={(event) => {
                    setReason(event.target.value)
                    setErrors((current) => ({
                      ...current,
                      reason: undefined,
                    }))
                    setConfirmation('')
                  }}
                  placeholder={`Describa el motivo${isDiscarding ? ' del descarte' : ' de la reapertura'}...`}
                  required
                  value={reason}
                />
                {errors.reason && (
                  <p
                    className="mt-1.5 text-sm text-rose-700"
                    id="follow-up-reason-error"
                  >
                    {errors.reason}
                  </p>
                )}
              </div>
            )}

            <div>
              <label
                className="block text-sm font-medium text-slate-700"
                htmlFor="follow-up-next-status"
              >
                Próximo estado <span className="text-rose-700">*</span>
              </label>
              <select
                aria-describedby={
                  errors.nextStatus ? 'follow-up-next-status-error' : undefined
                }
                aria-invalid={Boolean(errors.nextStatus)}
                className={fieldClassName}
                disabled={transitions.length === 0}
                id="follow-up-next-status"
                name="nextStatus"
                onChange={(event) => {
                  const value = event.target.value as IncidentStatus | ''
                  if (value !== nextStatus) {
                    setObservation('')
                    setReason('')
                  }
                  setNextStatus(value)
                  if (value !== 'Asignado') setResponsibleUserId('')
                  setErrors((current) => ({ ...current, nextStatus: undefined, reason: undefined, responsible: undefined }))
                  setConfirmation('')
                }}
                required
                value={nextStatus}
              >
                <option value="">Seleccionar próximo estado</option>
                {transitions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              {errors.nextStatus && (
                <p
                  className="mt-1.5 text-sm text-rose-700"
                  id="follow-up-next-status-error"
                >
                  {errors.nextStatus}
                </p>
              )}
              {transitions.length === 0 && (
                <p className="mt-1.5 text-xs leading-5 text-slate-500">
                  No hay transiciones disponibles para este estado.
                </p>
              )}
            </div>

            {currentIncidentStatus === 'En revisión' && nextStatus === 'Asignado' && (
              <div>
                <label
                  className="block text-sm font-medium text-slate-700"
                  htmlFor="follow-up-responsible"
                >
                  Responsable <span className="text-rose-700">*</span>
                </label>
                <select
                  aria-describedby={
                    errors.responsible ? 'follow-up-responsible-error' : undefined
                  }
                  aria-invalid={Boolean(errors.responsible)}
                  className={fieldClassName}
                  id="follow-up-responsible"
                  name="responsible"
                  onChange={(event) => {
                    setResponsibleUserId(event.target.value)
                    setErrors((current) => ({
                      ...current,
                      responsible: undefined,
                    }))
                    setConfirmation('')
                  }}
                  required
                  value={responsibleUserId}
                >
                  <option value="">Seleccione un responsable</option>
                  {assignableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.nombres} {user.apellidos} · {user.role}
                    </option>
                  ))}
                </select>
                {errors.responsible && (
                  <p
                    className="mt-1.5 text-sm text-rose-700"
                    id="follow-up-responsible-error"
                  >
                    {errors.responsible}
                  </p>
                )}
                {selectedResponsible && (
                  <dl className="mt-3 grid grid-cols-1 gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-medium text-slate-500">
                        Nombre completo
                      </dt>
                      <dd className="mt-1 text-slate-800">
                        {selectedResponsible.nombres} {selectedResponsible.apellidos}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Rol</dt>
                      <dd className="mt-1 text-slate-800">
                        {selectedResponsible.role}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-medium text-slate-500">
                        Correo electrónico
                      </dt>
                      <dd className="mt-1 break-all text-slate-800">
                        {selectedResponsible.email}
                      </dd>
                    </div>
                  </dl>
                )}
              </div>
            )}

            <button
              className="inline-flex items-center justify-center rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={transitions.length === 0}
              type="submit"
            >
              Registrar seguimiento
            </button>
          </form>
        </section>
      </div>

      {confirmation && (
        <p
          aria-live="polite"
          className="mt-5 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900"
          role="status"
        >
          {confirmation} Los cambios son temporales y se perderán al recargar.
        </p>
      )}

      <p className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
        Los cambios de seguimiento se almacenan temporalmente y se perderán al
        recargar la página.
      </p>
    </section>
  )
}

export default IncidentFollowUpPage