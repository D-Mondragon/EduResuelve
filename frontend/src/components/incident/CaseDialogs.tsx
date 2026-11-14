import { Save, Trash2 } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { api, ApiError } from '../../lib/api'
import { todayInLima } from '../../lib/format'
import { isValidDni } from '../../lib/validation'
import {
  measureKinds,
  participantRoles,
  referralEntities,
  signatureStatuses,
  statementSources,
  statementStatuses,
  type CaseKind,
  type CaseMeeting,
  type CaseParticipant,
  type FormalFormData,
  type MeasureKind,
  type ParticipantRole,
  type ReferralEntity,
  type SignatureStatus,
  type StatementSource,
  type StatementStatus,
} from '../../types/case'
import type { IncidentDetail } from '../../types/incident'
import { useToast } from '../toast/toastContext'
import { Button } from '../ui/Button'
import { Alert } from '../ui/Feedback'
import { Field, Input, Select, Textarea } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { validateFormal, type FormalErrors } from '../../lib/formal'
import { FormalFields } from './FormalFields'

type Errors = Record<string, string | undefined>

function hasErrors(errors: Errors) {
  return Object.values(errors).some(Boolean)
}

function focusFirst(prefix: string, errors: Errors) {
  const first = Object.entries(errors).find(([, value]) => value)?.[0]
  if (first) document.getElementById(`${prefix}-${first}`)?.focus()
}

/** Diálogo con formulario: el botón principal envía el formulario aunque esté en el pie. */
function FormDialog({
  id,
  title,
  description,
  onClose,
  onSubmit,
  saving,
  error,
  submitLabel = 'Guardar',
  children,
}: {
  id: string
  title: string
  description?: string
  onClose: () => void
  onSubmit: () => void
  saving: boolean
  error: string
  submitLabel?: string
  children: ReactNode
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }
  return (
    <Modal
      description={description}
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancelar
          </Button>
          <Button form={id} icon={Save} loading={saving} type="submit">
            {submitLabel}
          </Button>
        </>
      }
      onClose={onClose}
      open
      size="lg"
      title={title}
    >
      <form className="space-y-5" id={id} noValidate onSubmit={handleSubmit}>
        {error && <Alert tone="error">{error}</Alert>}
        {children}
      </form>
    </Modal>
  )
}

/** Envuelve la llamada a la API: estado de guardado, error y aviso al terminar. */
function useSave(onSaved: () => void, onClose: () => void) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { notify } = useToast()
  async function run(action: () => Promise<unknown>, message: string) {
    setSaving(true)
    setError('')
    try {
      await action()
      notify(message)
      onSaved()
      onClose()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo guardar. Intenta nuevamente.')
    } finally {
      setSaving(false)
    }
  }
  return { saving, error, run }
}

interface DialogProps {
  incident: IncidentDetail
  onClose: () => void
  onSaved: () => void
}

/* ---------------------------------------------------------------- Registro formal */
export function FormalDialog({ incident, onClose, onSaved }: DialogProps) {
  const current = incident.case!
  const [values, setValues] = useState<FormalFormData>({
    regime: current.regime,
    incidentTime: current.incidentTime ?? '',
    immediateActions: current.immediateActions,
    objective: false,
  })
  const [errors, setErrors] = useState<FormalErrors>({})
  const { saving, error, run } = useSave(onSaved, onClose)

  function submit() {
    const next = validateFormal(values)
    setErrors(next)
    if (hasErrors(next)) return focusFirst('formal', next)
    void run(() => api.registerFormal(incident.code, values), 'Registro formal guardado.')
  }

  return (
    <FormDialog
      description="El nombre de quien hizo el primer registro formal se conserva; el cambio queda en el historial."
      error={error}
      id="formal-form"
      onClose={onClose}
      onSubmit={submit}
      saving={saving}
      title={current.formalRegisteredAt ? 'Actualizar registro formal' : 'Registro formal del incidente'}
    >
      <FormalFields
        errors={errors}
        onChange={(next, key) => {
          setValues(next)
          setErrors((c) => ({ ...c, [key]: undefined }))
        }}
        values={values}
      />
    </FormDialog>
  )
}

/* ---------------------------------------------------------------- Personas */
interface ParticipantForm {
  role: ParticipantRole | ''
  fullName: string
  dni: string
  gradeSection: string
  statementStatus: StatementStatus
  statementBy: StatementSource | ''
  statement: string
}

export function ParticipantDialog({ incident, onClose, onSaved, participant }: DialogProps & { participant?: CaseParticipant }) {
  const [values, setValues] = useState<ParticipantForm>({
    role: participant?.role ?? '',
    fullName: participant?.fullName ?? '',
    dni: participant?.dni ?? '',
    gradeSection: participant?.gradeSection ?? '',
    statementStatus: participant?.statementStatus ?? 'Pendiente',
    statementBy: participant?.statementBy ?? '',
    statement: participant?.statement ?? '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const { saving, error, run } = useSave(onSaved, onClose)
  const set = <K extends keyof ParticipantForm>(key: K, value: ParticipantForm[K]) => {
    setValues((c) => ({ ...c, [key]: value }))
    setErrors((c) => ({ ...c, [key]: undefined }))
  }

  function submit() {
    const next: Errors = {
      role: values.role ? undefined : 'Selecciona el rol.',
      fullName: values.fullName.trim().length >= 3 ? undefined : 'Ingresa los nombres y apellidos.',
      dni: !values.dni || isValidDni(values.dni) ? undefined : 'El DNI debe tener 8 dígitos.',
      statementBy:
        values.statementStatus === 'Registrada' && !values.statementBy ? 'Indica quién brindó la versión.' : undefined,
      statement:
        values.statementStatus === 'Registrada' && !values.statement.trim() ? 'Escribe la versión de los hechos.' : undefined,
    }
    setErrors(next)
    if (hasErrors(next)) return focusFirst('participant', next)
    void run(
      () => api.caseSave(incident.code, 'participant', { ...values, id: participant?.id }),
      participant ? 'Datos actualizados.' : 'Persona agregada al caso.',
    )
  }

  return (
    <FormDialog
      description="Datos de uso interno: en las copias para la familia y para terceros se muestran solo iniciales."
      error={error}
      id="participant-form"
      onClose={onClose}
      onSubmit={submit}
      saving={saving}
      title={participant ? 'Editar persona' : 'Agregar persona'}
    >
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <Field error={errors.role} hint="Lenguaje neutral: no se usa “agresor” ni “víctima”." id="participant-role" label="Rol en el hecho" required>
          <Select onChange={(e) => set('role', e.target.value as ParticipantRole)} value={values.role}>
            <option value="">Selecciona el rol</option>
            {participantRoles.map((role) => (
              <option key={role}>{role}</option>
            ))}
          </Select>
        </Field>
        <Field error={errors.fullName} id="participant-fullName" label="Nombres y apellidos" required>
          <Input autoComplete="off" maxLength={120} onChange={(e) => set('fullName', e.target.value)} value={values.fullName} />
        </Field>
        <Field error={errors.dni} hint="Opcional. Se muestra parcialmente oculto." id="participant-dni" label="DNI">
          <Input inputMode="numeric" maxLength={8} onChange={(e) => set('dni', e.target.value.replace(/\D/g, ''))} value={values.dni} />
        </Field>
        <Field id="participant-gradeSection" label="Grado y sección">
          <Input maxLength={40} onChange={(e) => set('gradeSection', e.target.value)} placeholder="Ej.: 3.º B" value={values.gradeSection} />
        </Field>
      </div>

      <fieldset className="space-y-4 rounded-lg border border-line p-4">
        <legend className="px-1 text-sm font-semibold text-ink">Versión de los hechos</legend>
        <p className="text-xs leading-5 text-muted">
          Se consigna antes de decidir cualquier medida (D.S. 021-2026-MINEDU, 8.2). Escríbela tal como fue expresada y
          pide la firma en el acta impresa.
        </p>
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field id="participant-statementStatus" label="Estado">
            <Select onChange={(e) => set('statementStatus', e.target.value as StatementStatus)} value={values.statementStatus}>
              {statementStatuses.map((status) => (
                <option key={status} value={status}>
                  {status === 'Registrada' ? 'Registrada' : status === 'Se abstuvo' ? 'Se abstuvo de declarar' : 'Pendiente'}
                </option>
              ))}
            </Select>
          </Field>
          {values.statementStatus === 'Registrada' && (
            <Field error={errors.statementBy} id="participant-statementBy" label="Brindada por" required>
              <Select onChange={(e) => set('statementBy', e.target.value as StatementSource)} value={values.statementBy}>
                <option value="">Selecciona</option>
                {statementSources.map((source) => (
                  <option key={source}>{source}</option>
                ))}
              </Select>
            </Field>
          )}
        </div>
        {values.statementStatus === 'Registrada' && (
          <Field
            counter={[values.statement.length, 2000]}
            error={errors.statement}
            id="participant-statement"
            label="Versión"
            required
          >
            <Textarea maxLength={2000} onChange={(e) => set('statement', e.target.value)} value={values.statement} />
          </Field>
        )}
      </fieldset>
    </FormDialog>
  )
}

/* ---------------------------------------------------------------- Medidas */
export function MeasureDialog({ incident, onClose, onSaved }: DialogProps) {
  const c = incident.case!
  const students = c.participants.filter((p) => p.role === 'Estudiante involucrado')
  const [values, setValues] = useState({ participantId: '', kind: '' as MeasureKind | '', description: '', isSeparation: false })
  const [errors, setErrors] = useState<Errors>({})
  const { saving, error, run } = useSave(onSaved, onClose)
  const selected = students.find((s) => String(s.id) === values.participantId)

  function submit() {
    const next: Errors = {
      participantId: values.participantId ? undefined : 'Selecciona al estudiante.',
      kind: values.kind ? undefined : 'Selecciona el tipo de medida.',
      description: values.description.trim() ? undefined : 'Describe la medida.',
    }
    if (selected && selected.statementStatus === 'Pendiente') {
      next.participantId = 'Primero consigna la versión de los hechos de este estudiante o de su familia.'
    }
    setErrors(next)
    if (hasErrors(next)) return focusFirst('measure', next)
    void run(
      () => api.caseSave(incident.code, 'measure', { ...values, participantId: Number(values.participantId) }),
      'Medida registrada.',
    )
  }

  return (
    <FormDialog
      description={`Falta ${c.severity?.toLowerCase()}. ${c.severity === 'Leve' ? 'La decide el docente u Orientación.' : 'La decide Dirección.'}`}
      error={error}
      id="measure-form"
      onClose={onClose}
      onSubmit={submit}
      saving={saving}
      title="Registrar medida"
    >
      <Field error={errors.participantId} id="measure-participantId" label="Estudiante involucrado" required>
        <Select
          onChange={(e) => {
            setValues((v) => ({ ...v, participantId: e.target.value }))
            setErrors((x) => ({ ...x, participantId: undefined }))
          }}
          value={values.participantId}
        >
          <option value="">Selecciona al estudiante</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName}
              {s.statementStatus === 'Pendiente' ? ' (versión pendiente)' : ''}
            </option>
          ))}
        </Select>
      </Field>
      <Field error={errors.kind} id="measure-kind" label="Tipo de medida" required>
        <Select
          onChange={(e) => {
            setValues((v) => ({ ...v, kind: e.target.value as MeasureKind }))
            setErrors((x) => ({ ...x, kind: undefined }))
          }}
          value={values.kind}
        >
          <option value="">Selecciona</option>
          {measureKinds.map((kind) => (
            <option key={kind}>{kind}</option>
          ))}
        </Select>
      </Field>
      <Field counter={[values.description.length, 1000]} error={errors.description} id="measure-description" label="Descripción de la medida" required>
        <Textarea
          maxLength={1000}
          onChange={(e) => {
            setValues((v) => ({ ...v, description: e.target.value }))
            setErrors((x) => ({ ...x, description: undefined }))
          }}
          value={values.description}
        />
      </Field>
      {c.severity === 'Muy grave' && (
        <label className="flex items-start gap-3 text-sm text-ink-2" htmlFor="measure-separation">
          <input
            checked={values.isSeparation}
            className="mt-0.5 size-4 shrink-0 accent-emerald-700"
            id="measure-separation"
            onChange={(e) => setValues((v) => ({ ...v, isSeparation: e.target.checked }))}
            type="checkbox"
          />
          <span>
            Es una separación del estudiante. El acta informará a la familia de su derecho a pedir la reconsideración.
          </span>
        </label>
      )}
    </FormDialog>
  )
}

/* ---------------------------------------------------------------- Reunión con la familia */
export function MeetingDialog({ incident, onClose, onSaved, meeting }: DialogProps & { meeting?: CaseMeeting }) {
  const [values, setValues] = useState({
    meetingDate: meeting?.meetingDate ?? todayInLima(),
    attendees: meeting?.attendees ?? '',
    agreements: meeting?.agreements ?? '',
    signatureStatus: (meeting?.signatureStatus ?? 'Pendiente de firma') as SignatureStatus,
    notes: meeting?.notes ?? '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const { saving, error, run } = useSave(onSaved, onClose)
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setValues((c) => ({ ...c, [key]: value }))
    setErrors((c) => ({ ...c, [key]: undefined }))
  }

  function submit() {
    const next: Errors = {
      meetingDate:
        !values.meetingDate || values.meetingDate > todayInLima() || values.meetingDate < incident.incidentDate
          ? 'La fecha debe estar entre la fecha del hecho y hoy.'
          : undefined,
      attendees: values.attendees.trim() ? undefined : 'Indica quiénes asistieron.',
      agreements: values.agreements.trim() ? undefined : 'Registra los acuerdos y compromisos.',
    }
    setErrors(next)
    if (hasErrors(next)) return focusFirst('meeting', next)
    void run(() => api.caseSave(incident.code, 'meeting', { ...values, id: meeting?.id }), 'Reunión registrada.')
  }

  return (
    <FormDialog
      description="Acuerdos y compromisos verificables con la familia (D.S. 021-2026-MINEDU, 9.1)."
      error={error}
      id="meeting-form"
      onClose={onClose}
      onSubmit={submit}
      saving={saving}
      title={meeting ? 'Editar reunión con la familia' : 'Registrar reunión con la familia'}
    >
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <Field error={errors.meetingDate} id="meeting-meetingDate" label="Fecha de la reunión" required>
          <Input max={todayInLima()} min={incident.incidentDate} onChange={(e) => set('meetingDate', e.target.value)} type="date" value={values.meetingDate} />
        </Field>
        <Field hint="Si se negaron a firmar, el acta deja constancia." id="meeting-signatureStatus" label="Firma del acta">
          <Select onChange={(e) => set('signatureStatus', e.target.value as SignatureStatus)} value={values.signatureStatus}>
            {signatureStatuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field counter={[values.attendees.length, 300]} error={errors.attendees} hint="Ej.: madre del estudiante, tutora y orientadora." id="meeting-attendees" label="Asistentes" required>
        <Input maxLength={300} onChange={(e) => set('attendees', e.target.value)} value={values.attendees} />
      </Field>
      <Field
        counter={[values.agreements.length, 2000]}
        error={errors.agreements}
        hint="Qué se hará, quién lo hará y cuándo se verificará."
        id="meeting-agreements"
        label="Acuerdos y compromisos"
        required
      >
        <Textarea maxLength={2000} onChange={(e) => set('agreements', e.target.value)} value={values.agreements} />
      </Field>
      <Field counter={[values.notes.length, 1000]} id="meeting-notes" label="Notas">
        <Textarea className="min-h-16" maxLength={1000} onChange={(e) => set('notes', e.target.value)} value={values.notes} />
      </Field>
    </FormDialog>
  )
}

/* ---------------------------------------------------------------- Derivaciones */
export function ReferralDialog({ incident, onClose, onSaved }: DialogProps) {
  const [values, setValues] = useState({ entity: '' as ReferralEntity | '', officeNumber: '', referralDate: todayInLima(), notes: '' })
  const [errors, setErrors] = useState<Errors>({})
  const { saving, error, run } = useSave(onSaved, onClose)
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => {
    setValues((c) => ({ ...c, [key]: value }))
    setErrors((c) => ({ ...c, [key]: undefined }))
  }

  function submit() {
    const next: Errors = {
      entity: values.entity ? undefined : 'Selecciona la institución.',
      officeNumber: values.officeNumber.trim() ? undefined : 'Ingresa el número de oficio.',
      referralDate:
        !values.referralDate || values.referralDate > todayInLima() || values.referralDate < incident.incidentDate
          ? 'La fecha debe estar entre la fecha del hecho y hoy.'
          : undefined,
    }
    setErrors(next)
    if (hasErrors(next)) return focusFirst('referral', next)
    void run(() => api.caseSave(incident.code, 'referral', values), 'Derivación registrada.')
  }

  return (
    <FormDialog
      description="Comunicación a otra institución según los protocolos de la R.M. 383-2025-MINEDU."
      error={error}
      id="referral-form"
      onClose={onClose}
      onSubmit={submit}
      saving={saving}
      title="Registrar derivación"
    >
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <Field error={errors.entity} id="referral-entity" label="Institución" required>
          <Select onChange={(e) => set('entity', e.target.value as ReferralEntity)} value={values.entity}>
            <option value="">Selecciona</option>
            {referralEntities.map((entity) => (
              <option key={entity}>{entity}</option>
            ))}
          </Select>
        </Field>
        <Field error={errors.referralDate} id="referral-referralDate" label="Fecha" required>
          <Input max={todayInLima()} min={incident.incidentDate} onChange={(e) => set('referralDate', e.target.value)} type="date" value={values.referralDate} />
        </Field>
      </div>
      <Field error={errors.officeNumber} hint="Ej.: Oficio N.° 015-2026-IE/D" id="referral-officeNumber" label="Número de oficio" required>
        <Input maxLength={60} onChange={(e) => set('officeNumber', e.target.value)} value={values.officeNumber} />
      </Field>
      <Field counter={[values.notes.length, 500]} id="referral-notes" label="Notas">
        <Textarea className="min-h-16" maxLength={500} onChange={(e) => set('notes', e.target.value)} value={values.notes} />
      </Field>
    </FormDialog>
  )
}

/* ---------------------------------------------------------------- Eliminar con motivo */
export function RemoveDialog({
  incident,
  onClose,
  onSaved,
  kind,
  id,
  label,
}: DialogProps & { kind: CaseKind; id: number; label: string }) {
  const [reason, setReason] = useState('')
  const [fieldError, setFieldError] = useState('')
  const { saving, error, run } = useSave(onSaved, onClose)
  return (
    <Modal
      description={label}
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancelar
          </Button>
          <Button
            icon={Trash2}
            loading={saving}
            onClick={() => {
              if (!reason.trim()) {
                setFieldError('Indica el motivo.')
                document.getElementById('remove-reason')?.focus()
                return
              }
              void run(() => api.caseRemove(incident.code, kind, id, reason), 'Registro eliminado. Queda constancia en el historial.')
            }}
            variant="danger"
          >
            Eliminar
          </Button>
        </>
      }
      onClose={onClose}
      open
      title="¿Eliminar este registro?"
    >
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field error={fieldError} hint="El motivo queda en el historial del caso." id="remove-reason" label="Motivo" required>
          <Textarea
            data-autofocus
            maxLength={500}
            onChange={(e) => {
              setReason(e.target.value)
              setFieldError('')
            }}
            value={reason}
          />
        </Field>
      </div>
    </Modal>
  )
}
