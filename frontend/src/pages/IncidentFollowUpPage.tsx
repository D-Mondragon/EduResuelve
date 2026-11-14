import {
  CircleSlash,
  Eye,
  Hammer,
  History,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { FormalFields } from '../components/incident/FormalFields'
import { emptyFormal, validateFormal, type FormalErrors } from '../lib/formal'
import { IncidentHeader } from '../components/incident/IncidentHeader'
import { Timeline } from '../components/incident/Timeline'
import { useToast } from '../components/toast/toastContext'
import { StatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Alert, Card, CardHeader, ErrorState, LoadingState } from '../components/ui/Feedback'
import { Field, Select, Textarea } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { useAsync } from '../hooks/useAsync'
import { useIncident } from '../hooks/useIncident'
import { api, ApiError } from '../lib/api'
import { can } from '../lib/permissions'
import { cn } from '../lib/ui'
import type { IncidentAction, IncidentStatus } from '../types/incident'
import type { FormalFormData } from '../types/case'
import type { UserRef } from '../types/user'

type FollowUpAction = Extract<IncidentAction, 'review' | 'assign' | 'start' | 'discard' | 'reopen' | 'reassign'>

const actionInfo: Record<
  FollowUpAction,
  { label: string; description: string; icon: LucideIcon; to?: IncidentStatus; destructive?: boolean }
> = {
  review: { label: 'Iniciar revisión', description: 'Analiza la información antes de asignar o descartar.', icon: Eye, to: 'En revisión' },
  assign: { label: 'Asignar responsable', description: 'Elige a la persona que atenderá la incidencia.', icon: UserCheck, to: 'Asignado' },
  start: { label: 'Iniciar atención', description: 'Indica que comenzaste a atender la incidencia.', icon: Hammer, to: 'En atención' },
  discard: { label: 'Descartar', description: 'No procede atenderla. Requiere motivo (RN-007).', icon: CircleSlash, to: 'Descartado', destructive: true },
  reopen: { label: 'Reabrir', description: 'Vuelve a revisión. Requiere motivo (RN-008).', icon: RotateCcw, to: 'En revisión', destructive: true },
  reassign: { label: 'Reasignar', description: 'Cambia el responsable desactivado. Requiere motivo.', icon: RefreshCcw },
}

const loadAssignable = () => api.assignableUsers()

function ResponsibleField({
  value,
  onChange,
  error,
  label,
  excludeId,
}: {
  value: string
  onChange: (value: string) => void
  error?: string
  label: string
  excludeId?: string
}) {
  const users = useAsync(loadAssignable)
  const options = (users.data ?? []).filter((user: UserRef) => user.id !== excludeId)
  return (
    <Field
      error={error || users.error?.message}
      hint="Solo usuarios activos con rol Docente, Orientador o Administrador (RN-004)."
      id="responsible"
      label={label}
      required
    >
      <Select disabled={users.loading} onChange={(e) => onChange(e.target.value)} value={value}>
        <option value="">{users.loading ? 'Cargando usuarios…' : 'Selecciona un responsable'}</option>
        {options.map((user) => (
          <option key={user.id} value={user.id}>
            {user.fullName} — {user.role}
          </option>
        ))}
      </Select>
    </Field>
  )
}

const order: FollowUpAction[] = ['reassign', 'review', 'assign', 'start', 'discard', 'reopen']

function IncidentFollowUpPage() {
  const { data: incident, error, loading, reload } = useIncident()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { notify } = useToast()
  const requested = params.get('accion') as FollowUpAction | null
  const [selected, setSelected] = useState<FollowUpAction | null>(null)
  const [observation, setObservation] = useState('')
  const [reason, setReason] = useState('')
  const [responsibleId, setResponsibleId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [formal, setFormal] = useState<FormalFormData>(emptyFormal)
  const [formalErrors, setFormalErrors] = useState<FormalErrors>({})

  const available = incident ? order.filter((action) => can(incident, action)) : []

  if (loading && !incident) return <LoadingState />
  if (error || !incident) return <ErrorState error={error ?? new Error('Incidencia no encontrada.')} onRetry={() => reload()} />

  const action: FollowUpAction | null =
    selected && available.includes(selected)
      ? selected
      : requested && available.includes(requested)
        ? requested
        : available.length === 1
          ? available[0]
          : null

  const needsResponsible = action === 'assign' || action === 'reassign'
  const needsReason = action === 'discard' || action === 'reopen' || action === 'reassign'
  const needsObservation = action === 'review' || action === 'assign' || action === 'start'
  // El registro formal (8.2) se completa al revisar, y es obligatorio antes de asignar
  const needsFormal =
    (action === 'review' || action === 'assign') && can(incident, 'formal') && !incident.case?.formalRegisteredAt

  function choose(next: FollowUpAction) {
    setSelected(next)
    setErrors({})
    setFormError('')
  }

  function validate() {
    const nextErrors: Record<string, string> = {}
    if (needsResponsible && !responsibleId) nextErrors.responsible = 'Selecciona un responsable.'
    if (needsReason && !reason.trim()) {
      nextErrors.reason =
        action === 'discard'
          ? 'Debe indicar el motivo del descarte.'
          : action === 'reopen'
            ? 'Debe indicar el motivo de la reapertura.'
            : 'Debe indicar el motivo de la reasignación.'
    }
    if (needsObservation && !observation.trim()) nextErrors.observation = 'Ingresa una observación para el seguimiento.'
    const nextFormalErrors = needsFormal ? validateFormal(formal) : {}
    setErrors(nextErrors)
    setFormalErrors(nextFormalErrors)
    const firstFormal = Object.keys(nextFormalErrors)[0]
    if (firstFormal) document.getElementById(`formal-${firstFormal}`)?.focus()
    return Object.keys(nextErrors).length === 0 && !firstFormal
  }

  async function execute() {
    if (!action || !incident) return
    setConfirming(false)
    setSaving(true)
    setFormError('')
    try {
      if (needsFormal) await api.registerFormal(incident.code, formal)
      if (action === 'reassign') {
        await api.reassign(incident.code, responsibleId, reason)
      } else {
        await api.transition(incident.code, action, { observation, reason, responsibleId: needsResponsible ? responsibleId : null })
      }
      notify(
        action === 'reassign'
          ? 'Responsable reasignado correctamente.'
          : `La incidencia pasó a "${actionInfo[action].to}".`,
      )
      navigate(`/incidencias/${encodeURIComponent(incident.code)}`)
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : 'No se pudo registrar el seguimiento.')
      reload(true)
    } finally {
      setSaving(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!action || !validate()) return
    if (actionInfo[action].destructive) setConfirming(true)
    else void execute()
  }

  return (
    <div className="space-y-6">
      <IncidentHeader incident={incident} section="Seguimiento" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            description="Las opciones dependen del estado actual y de tu rol."
            icon={ShieldCheck}
            title="Registrar seguimiento"
          />
          <div className="p-5 sm:p-6">
            {available.length === 0 ? (
              <Alert tone="info" title="Sin acciones disponibles">
                {incident.status === 'Cerrado' || incident.status === 'Descartado'
                  ? `La incidencia está ${incident.status.toLowerCase()}.`
                  : 'Con tu rol no puedes cambiar el estado de esta incidencia en este momento.'}{' '}
                Puedes consultar el historial completo a la derecha.
              </Alert>
            ) : (
              <form className="space-y-5" noValidate onSubmit={handleSubmit}>
                <fieldset>
                  <legend className="text-sm font-medium text-ink-2">¿Qué deseas hacer?</legend>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {available.map((key) => {
                      const info = actionInfo[key]
                      const Icon = info.icon
                      const checked = action === key
                      return (
                        <label
                          className={cn(
                            'flex cursor-pointer gap-3 rounded-xl border p-3.5 transition',
                            checked
                              ? info.destructive
                                ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-500 dark:bg-rose-400/10'
                                : 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600 dark:bg-emerald-400/10'
                              : 'border-line hover:bg-surface-2',
                          )}
                          key={key}
                        >
                          <input
                            checked={checked}
                            className="sr-only"
                            name="action"
                            onChange={() => choose(key)}
                            type="radio"
                            value={key}
                          />
                          <Icon
                            aria-hidden="true"
                            className={cn('mt-0.5 size-5 shrink-0', info.destructive ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-400')}
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-ink">{info.label}</span>
                            <span className="mt-0.5 block text-xs leading-5 text-muted">{info.description}</span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>

                {action && (
                  <>
                    {actionInfo[action].to && (
                      <p className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
                        Cambio de estado:
                        <StatusBadge status={incident.status} />→<StatusBadge status={actionInfo[action].to!} />
                      </p>
                    )}

                    {needsFormal && (
                      <div className="rounded-lg border border-line p-4 sm:p-5">
                        <FormalFields
                          errors={formalErrors}
                          onChange={(next, key) => {
                            setFormal(next)
                            setFormalErrors((current) => ({ ...current, [key]: undefined }))
                          }}
                          values={formal}
                        />
                      </div>
                    )}

                    {needsResponsible && (
                      <ResponsibleField
                        error={errors.responsible}
                        excludeId={action === 'reassign' ? incident.responsible?.id : undefined}
                        label={action === 'reassign' ? 'Nuevo responsable' : 'Responsable'}
                        onChange={(value) => {
                          setResponsibleId(value)
                          setErrors((c) => ({ ...c, responsible: '' }))
                        }}
                        value={responsibleId}
                      />
                    )}

                    {needsReason && (
                      <Field
                        counter={[reason.length, 500]}
                        error={errors.reason}
                        id="reason"
                        label={
                          action === 'discard'
                            ? 'Motivo del descarte'
                            : action === 'reopen'
                              ? 'Motivo de la reapertura'
                              : 'Motivo de la reasignación'
                        }
                        required
                      >
                        <Textarea
                          maxLength={500}
                          onChange={(e) => {
                            setReason(e.target.value)
                            setErrors((c) => ({ ...c, reason: '' }))
                          }}
                          value={reason}
                        />
                      </Field>
                    )}

                    {action !== 'reassign' && (
                      <Field
                        counter={[observation.length, 1000]}
                        error={errors.observation}
                        hint={needsObservation ? undefined : 'Opcional.'}
                        id="observation"
                        label="Observación"
                        required={needsObservation}
                      >
                        <Textarea
                          maxLength={1000}
                          onChange={(e) => {
                            setObservation(e.target.value)
                            setErrors((c) => ({ ...c, observation: '' }))
                          }}
                          placeholder="Describe brevemente lo realizado o decidido…"
                          value={observation}
                        />
                      </Field>
                    )}

                    {formError && <Alert tone="error">{formError}</Alert>}

                    <div className="flex justify-end">
                      <Button
                        icon={actionInfo[action].icon}
                        loading={saving}
                        type="submit"
                        variant={actionInfo[action].destructive ? 'danger' : 'primary'}
                      >
                        {actionInfo[action].label}
                      </Button>
                    </div>
                  </>
                )}
              </form>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader icon={History} title="Historial" />
          <div className="max-h-[70vh] overflow-y-auto p-5 sm:p-6">
            <Timeline entries={incident.followUps} newestFirst />
          </div>
        </Card>
      </div>

      <Modal
        description={`${incident.code}: ${incident.title}`}
        footer={
          <>
            <Button onClick={() => setConfirming(false)} variant="secondary">
              Cancelar
            </Button>
            <Button data-autofocus icon={action ? actionInfo[action].icon : undefined} onClick={() => void execute()} variant="danger">
              Sí, {action ? actionInfo[action].label.toLowerCase() : ''}
            </Button>
          </>
        }
        onClose={() => setConfirming(false)}
        open={confirming && Boolean(action)}
        title={action === 'discard' ? '¿Descartar la incidencia?' : '¿Reabrir la incidencia?'}
      >
        <p className="text-sm leading-6 text-ink-2">
          {action === 'discard'
            ? 'La incidencia quedará descartada y no podrá recibir más acciones.'
            : 'La incidencia volverá a "En revisión" y la resolución y el cierre anteriores quedarán sin efecto (se conservan en el historial).'}
        </p>
        <p className="mt-3 rounded-lg bg-surface-2 p-3 text-sm text-ink">
          <span className="font-medium">Motivo:</span> {reason}
        </p>
      </Modal>
    </div>
  )
}

export default IncidentFollowUpPage
