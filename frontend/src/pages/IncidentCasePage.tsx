import {
  AlertTriangle,
  BadgeCheck,
  ClipboardCheck,
  Gavel,
  Handshake,
  PencilLine,
  Plus,
  Save,
  Scale,
  Send,
  ShieldAlert,
  Trash2,
  Users,
} from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import {
  FormalDialog,
  MeasureDialog,
  MeetingDialog,
  ParticipantDialog,
  ReferralDialog,
  RemoveDialog,
} from '../components/incident/CaseDialogs'
import { IncidentHeader } from '../components/incident/IncidentHeader'
import { useToast } from '../components/toast/toastContext'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Alert, Card, CardHeader, DetailItem, ErrorState, LoadingState } from '../components/ui/Feedback'
import { Field, Input, Select } from '../components/ui/Field'
import { useIncident } from '../hooks/useIncident'
import { maskDni } from '../lib/caseDocs'
import { api, ApiError } from '../lib/api'
import { formatDate, formatDateTime } from '../lib/format'
import { can } from '../lib/permissions'
import {
  hasDiscipline,
  hasViolence,
  severities,
  violenceModalities,
  violenceTypes,
  type CaseKind,
  type CaseMeeting,
  type CaseParticipant,
  type IncidentCase,
  type Severity,
  type ViolenceModality,
  type ViolenceType,
} from '../types/case'
import type { IncidentDetail } from '../types/incident'

type Dialog =
  | { type: 'formal' }
  | { type: 'participant'; participant?: CaseParticipant }
  | { type: 'measure' }
  | { type: 'meeting'; meeting?: CaseMeeting }
  | { type: 'referral' }
  | { type: 'remove'; kind: CaseKind; id: number; label: string }

const statementTone: Record<string, string> = {
  Pendiente: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300',
  Registrada: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300',
  'Se abstuvo': 'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-400/10 dark:text-slate-300',
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>
}

function RowActions({ onEdit, onRemove, label }: { onEdit?: () => void; onRemove: () => void; label: string }) {
  return (
    <div className="flex shrink-0 gap-1">
      {onEdit && (
        <Button aria-label={`Editar ${label}`} icon={PencilLine} onClick={onEdit} size="sm" variant="ghost">
          <span className="sr-only sm:not-sr-only">Editar</span>
        </Button>
      )}
      <Button aria-label={`Eliminar ${label}`} icon={Trash2} onClick={onRemove} size="sm" variant="ghost">
        <span className="sr-only sm:not-sr-only">Eliminar</span>
      </Button>
    </div>
  )
}

/* ---------------------------------------------------------------- Calificación y Dirección */
function SeverityCard({ incident, c, onSaved }: { incident: IncidentDetail; c: IncidentCase; onSaved: () => void }) {
  const [severity, setSeverity] = useState<Severity | ''>(c.severity ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { notify } = useToast()

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!severity) {
      setError('Selecciona la gravedad.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.updateCase(incident.code, { severity })
      notify(severity === 'Leve' ? 'Calificación guardada.' : 'Calificación guardada. Se comunicó a Dirección.')
      onSaved()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  async function acknowledge() {
    setSaving(true)
    try {
      await api.acknowledgeDirector(incident.code)
      notify('Se registró que Dirección tomó conocimiento.')
      onSaved()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo registrar.')
    } finally {
      setSaving(false)
    }
  }

  const severe = c.severity === 'Grave' || c.severity === 'Muy grave'
  return (
    <Card label="Calificación de la falta">
      <CardHeader
        description="Las faltas graves y muy graves se comunican a Dirección dentro de las 24 horas (8.2)."
        icon={Gavel}
        title="Calificación de la falta"
      />
      <div className="space-y-4 p-5 sm:p-6">
        {c.canManage ? (
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" noValidate onSubmit={save}>
            <Field className="sm:w-64" error={error} id="case-severity" label="Gravedad">
              <Select onChange={(e) => setSeverity(e.target.value as Severity)} value={severity}>
                <option value="">Sin calificar</option>
                {severities.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Button disabled={severity === (c.severity ?? '')} icon={Save} loading={saving} type="submit" variant="secondary">
              Guardar calificación
            </Button>
          </form>
        ) : (
          <DetailItem label="Gravedad">{c.severity ?? 'Sin calificar'}</DetailItem>
        )}

        {severe && (
          <div className="space-y-3 rounded-lg border border-line bg-surface-2 p-4 text-sm">
            <p className="text-ink-2">
              Comunicada a Dirección el <strong>{formatDateTime(c.directorNotifiedAt)}</strong>
              {c.directorLate && <span className="font-semibold text-rose-700 dark:text-rose-400"> · fuera del plazo de 24 horas</span>}
            </p>
            {c.directorAckAt ? (
              <p className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <BadgeCheck aria-hidden="true" className="size-4" />
                Dirección tomó conocimiento: {c.directorAckBy?.fullName} · {formatDateTime(c.directorAckAt)}
              </p>
            ) : can(incident, 'acknowledge') ? (
              <Button icon={BadgeCheck} loading={saving} onClick={() => void acknowledge()} size="sm">
                Confirmar que Dirección tomó conocimiento
              </Button>
            ) : (
              <p className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <AlertTriangle aria-hidden="true" className="size-4" />
                Pendiente de confirmación de Dirección.
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

/* ---------------------------------------------------------------- Protocolo de violencia */
function ViolenceCard({ incident, c, onSaved }: { incident: IncidentDetail; c: IncidentCase; onSaved: () => void }) {
  const initial = {
    violenceType: (c.violenceType ?? '') as ViolenceType | '',
    violenceModality: (c.violenceModality ?? '') as ViolenceModality | '',
    siseveCode: c.siseveCode ?? '',
    bookFolio: c.bookFolio ?? '',
  }
  const [values, setValues] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { notify } = useToast()
  const unchanged = JSON.stringify(values) === JSON.stringify(initial)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.updateCase(incident.code, values)
      notify('Datos del protocolo guardados.')
      onSaved()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card label="Protocolo de violencia escolar">
      <CardHeader
        description="R.M. 383-2025-MINEDU. El caso se reporta manualmente en el SíseVe y en el Libro de Registro de Incidencias."
        icon={ShieldAlert}
        title="Protocolo de violencia escolar"
      />
      <form className="space-y-5 p-5 sm:p-6" noValidate onSubmit={save}>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <Field id="case-violenceType" label="Tipo de violencia">
            <Select disabled={!c.canManage} onChange={(e) => setValues((v) => ({ ...v, violenceType: e.target.value as ViolenceType }))} value={values.violenceType}>
              <option value="">Sin dato</option>
              {violenceTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field id="case-violenceModality" label="Modalidad">
            <Select
              disabled={!c.canManage}
              onChange={(e) => setValues((v) => ({ ...v, violenceModality: e.target.value as ViolenceModality }))}
              value={values.violenceModality}
            >
              <option value="">Sin dato</option>
              {violenceModalities.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </Field>
          <Field hint="Código que asigna el SíseVe al registrar el caso." id="case-siseveCode" label="Código SíseVe">
            <Input disabled={!c.canManage} maxLength={40} onChange={(e) => setValues((v) => ({ ...v, siseveCode: e.target.value }))} value={values.siseveCode} />
          </Field>
          <Field hint="Folio del Libro de Registro de Incidencias (Ley 29719)." id="case-bookFolio" label="Folio del Libro de Registro">
            <Input disabled={!c.canManage} maxLength={40} onChange={(e) => setValues((v) => ({ ...v, bookFolio: e.target.value }))} value={values.bookFolio} />
          </Field>
        </div>
        {c.canManage && (
          <div className="flex justify-end">
            <Button disabled={unchanged} icon={Save} loading={saving} type="submit" variant="secondary">
              Guardar datos del protocolo
            </Button>
          </div>
        )}
      </form>
    </Card>
  )
}

/* ---------------------------------------------------------------- Página */
function IncidentCasePage() {
  const { data: incident, error, loading, reload } = useIncident()
  const [dialog, setDialog] = useState<Dialog | null>(null)

  if (loading && !incident) return <LoadingState />
  if (error || !incident) return <ErrorState error={error ?? new Error('Incidencia no encontrada.')} onRetry={() => reload()} />

  const c = incident.case
  if (!c) {
    return (
      <div className="space-y-6">
        <IncidentHeader incident={incident} section="Convivencia" />
        <Alert tone="info" title="Información reservada">
          Los datos del caso los gestiona el personal de la institución. Recibirás notificaciones sobre el avance de tu reporte.
        </Alert>
      </div>
    )
  }

  const refresh = () => reload(true)
  const close = () => setDialog(null)
  const discipline = hasDiscipline(c.regime)
  const violence = hasViolence(c.regime)
  const caseOpen = c.regime !== 'Ninguno' && c.formalRegisteredAt !== null
  const manage = c.canManage
  const students = c.participants.filter((p) => p.role === 'Estudiante involucrado')
  const pendingStatements = students.filter((p) => p.statementStatus === 'Pendiente').length
  const measureBlocked = !c.severity
    ? 'Califica la falta antes de registrar medidas.'
    : students.length === 0
      ? 'Agrega al estudiante involucrado.'
      : c.severity !== 'Leve' && !c.canDecideSevere
        ? 'Las medidas por faltas graves o muy graves las registra Dirección.'
        : ''

  return (
    <div className="space-y-6">
      <IncidentHeader incident={incident} section="Convivencia" />

      {!manage && (
        <Alert tone="info">
          {incident.status === 'Cerrado' || incident.status === 'Descartado'
            ? `La incidencia está ${incident.status.toLowerCase()}: el caso solo se puede consultar.`
            : 'Puedes consultar el caso. Lo documenta el personal que lo atiende.'}
        </Alert>
      )}

      {/* Registro formal */}
      <Card label="Registro formal del incidente">
        <CardHeader
          action={
            manage && (
              <Button icon={c.formalRegisteredAt ? PencilLine : ClipboardCheck} onClick={() => setDialog({ type: 'formal' })} size="sm" variant={c.formalRegisteredAt ? 'secondary' : 'primary'}>
                {c.formalRegisteredAt ? 'Actualizar' : 'Hacer registro formal'}
              </Button>
            )
          }
          description="D.S. 021-2026-MINEDU, numeral 8.2"
          icon={ClipboardCheck}
          title="Registro formal del incidente"
        />
        <div className="p-5 sm:p-6">
          {c.formalRegisteredAt ? (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
              <DetailItem label="Régimen">{c.regime}</DetailItem>
              <DetailItem label="Fecha y hora del hecho">
                {formatDate(incident.incidentDate, 'long')} · {c.incidentTime ?? '—'}
              </DetailItem>
              <DetailItem label="Registró">
                {c.formalRegisteredBy?.fullName ?? '—'}
                <span className="block text-xs text-muted">
                  {c.formalRegisteredBy?.role} · {formatDateTime(c.formalRegisteredAt)}
                </span>
              </DetailItem>
              <div className="sm:col-span-3">
                <DetailItem label="Acciones inmediatas">
                  <span className="whitespace-pre-line">{c.immediateActions}</span>
                </DetailItem>
              </div>
            </dl>
          ) : (
            <Alert tone="warning" title="Falta el registro formal">
              Lo hace el personal de la institución antes de asignar la incidencia: régimen aplicable, hora del hecho y
              acciones inmediatas.
            </Alert>
          )}
          {c.formalRegisteredAt && c.regime === 'Ninguno' && (
            <p className="mt-4 text-sm text-muted">
              Esta incidencia no es un caso de convivencia. Si involucra la conducta de estudiantes o violencia escolar,
              actualiza el régimen en el registro formal.
            </p>
          )}
        </div>
      </Card>

      {caseOpen && (
        <>
          {/* Personas */}
          <Card label="Personas involucradas">
            <CardHeader
              action={
                manage && (
                  <Button icon={Plus} onClick={() => setDialog({ type: 'participant' })} size="sm" variant="secondary">
                    Agregar persona
                  </Button>
                )
              }
              description="Estudiantes y testigos, con su versión de los hechos"
              icon={Users}
              title="Personas involucradas"
            />
            <div className="p-5 sm:p-6">
              {c.participants.length === 0 ? (
                <Empty>Aún no se registraron personas.</Empty>
              ) : (
                <ul className="divide-y divide-line">
                  {c.participants.map((p) => (
                    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between" key={p.id}>
                      <div className="min-w-0 space-y-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                          {p.fullName}
                          <span className="text-xs font-medium text-muted">
                            {p.role}
                            {p.gradeSection && ` · ${p.gradeSection}`}
                            {p.dni && ` · DNI ${maskDni(p.dni)}`}
                          </span>
                        </p>
                        <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                          <Badge className={statementTone[p.statementStatus]}>
                            Versión: {p.statementStatus === 'Se abstuvo' ? 'se abstuvo' : p.statementStatus.toLowerCase()}
                          </Badge>
                          {p.statementAt && <span>{formatDateTime(p.statementAt)}{p.statementBy && ` · ${p.statementBy}`}</span>}
                        </p>
                        {p.statement && <p className="whitespace-pre-line text-sm leading-6 text-ink-2">“{p.statement}”</p>}
                      </div>
                      {manage && (
                        <RowActions
                          label={p.fullName}
                          onEdit={() => setDialog({ type: 'participant', participant: p })}
                          onRemove={() => setDialog({ type: 'remove', kind: 'participant', id: p.id, label: `${p.fullName} (${p.role})` })}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {discipline && pendingStatements > 0 && (
                <p className="mt-4 text-sm text-amber-800 dark:text-amber-300">
                  {pendingStatements === 1 ? 'Un estudiante involucrado tiene' : `${pendingStatements} estudiantes involucrados tienen`} la
                  versión de los hechos pendiente: se consigna antes de decidir medidas.
                </p>
              )}
            </div>
          </Card>

          {discipline && <SeverityCard c={c} incident={incident} key={`sev-${c.severity}-${c.directorAckAt}`} onSaved={refresh} />}

          {discipline && (
            <Card label="Medidas adoptadas">
              <CardHeader
                action={
                  manage && (
                    <Button
                      disabled={Boolean(measureBlocked)}
                      icon={Plus}
                      onClick={() => setDialog({ type: 'measure' })}
                      size="sm"
                      title={measureBlocked || undefined}
                      variant="secondary"
                    >
                      Registrar medida
                    </Button>
                  )
                }
                description="Leves: docente u Orientación. Graves y muy graves: Dirección (D.S. 021-2026-MINEDU, IX)."
                icon={Scale}
                title="Medidas adoptadas"
              />
              <div className="p-5 sm:p-6">
                {manage && measureBlocked && <p className="mb-3 text-sm text-muted">{measureBlocked}</p>}
                {c.measures.length === 0 ? (
                  <Empty>No se registraron medidas.</Empty>
                ) : (
                  <ul className="divide-y divide-line">
                    {c.measures.map((m) => (
                      <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between" key={m.id}>
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-semibold text-ink">
                            Medida {m.kind.toLowerCase()} · {m.participantName}
                            {m.isSeparation && <span className="ml-2 text-xs font-semibold text-rose-700 dark:text-rose-400">Separación</span>}
                          </p>
                          <p className="whitespace-pre-line text-sm leading-6 text-ink-2">{m.description}</p>
                          <p className="text-xs text-muted">
                            Decidió {m.decidedBy?.fullName} ({m.decidedBy?.role}) · {formatDateTime(m.decidedAt)}
                          </p>
                        </div>
                        {manage && (c.severity === 'Leve' || c.canDecideSevere) && (
                          <RowActions
                            label={`la medida de ${m.participantName}`}
                            onRemove={() => setDialog({ type: 'remove', kind: 'measure', id: m.id, label: `Medida ${m.kind.toLowerCase()} de ${m.participantName}` })}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          )}

          {/* Reunión con la familia */}
          <Card label="Reunión con la familia">
            <CardHeader
              action={
                manage && (
                  <Button icon={Plus} onClick={() => setDialog({ type: 'meeting' })} size="sm" variant="secondary">
                    Registrar reunión
                  </Button>
                )
              }
              description="Acuerdos y compromisos verificables (9.1). La familia firma el acta impresa o se deja constancia de su negativa."
              icon={Handshake}
              title="Reunión con la familia"
            />
            <div className="p-5 sm:p-6">
              {c.meetings.length === 0 ? (
                <Empty>No se registraron reuniones.</Empty>
              ) : (
                <ul className="divide-y divide-line">
                  {c.meetings.map((m) => (
                    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between" key={m.id}>
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-semibold text-ink">
                          {formatDate(m.meetingDate, 'long')} · <span className="font-medium text-muted">{m.signatureStatus}</span>
                        </p>
                        <p className="text-xs text-muted">Asistentes: {m.attendees}</p>
                        <p className="whitespace-pre-line text-sm leading-6 text-ink-2">{m.agreements}</p>
                        {m.notes && <p className="text-xs text-muted">{m.notes}</p>}
                      </div>
                      {manage && (
                        <RowActions
                          label={`la reunión del ${formatDate(m.meetingDate)}`}
                          onEdit={() => setDialog({ type: 'meeting', meeting: m })}
                          onRemove={() => setDialog({ type: 'remove', kind: 'meeting', id: m.id, label: `Reunión del ${formatDate(m.meetingDate)}` })}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {violence && <ViolenceCard c={c} incident={incident} key={`vio-${c.siseveCode}-${c.bookFolio}-${c.violenceType}-${c.violenceModality}`} onSaved={refresh} />}

          {/* Derivaciones */}
          <Card label="Derivaciones">
            <CardHeader
              action={
                manage && (
                  <Button icon={Plus} onClick={() => setDialog({ type: 'referral' })} size="sm" variant="secondary">
                    Registrar derivación
                  </Button>
                )
              }
              description="DEMUNA, UPE, PNP, Fiscalía, UGEL u otras instituciones"
              icon={Send}
              title="Derivaciones"
            />
            <div className="p-5 sm:p-6">
              {c.referrals.length === 0 ? (
                <Empty>No se registraron derivaciones.</Empty>
              ) : (
                <ul className="divide-y divide-line">
                  {c.referrals.map((r) => (
                    <li className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between" key={r.id}>
                      <div className="min-w-0 text-sm">
                        <p className="font-semibold text-ink">
                          {r.entity} · <span className="font-mono font-medium">{r.officeNumber}</span>
                        </p>
                        <p className="text-xs text-muted">
                          {formatDate(r.referralDate, 'long')}
                          {r.notes && ` · ${r.notes}`}
                        </p>
                      </div>
                      {manage && (
                        <RowActions
                          label={`la derivación a ${r.entity}`}
                          onRemove={() => setDialog({ type: 'remove', kind: 'referral', id: r.id, label: `Derivación a ${r.entity} (${r.officeNumber})` })}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <p className="text-xs leading-5 text-muted">
            Este registro no exime de activar los protocolos de atención de la violencia escolar ni de reportar el caso en el SíseVe.
          </p>
        </>
      )}

      {dialog?.type === 'formal' && <FormalDialog incident={incident} onClose={close} onSaved={refresh} />}
      {dialog?.type === 'participant' && (
        <ParticipantDialog incident={incident} onClose={close} onSaved={refresh} participant={dialog.participant} />
      )}
      {dialog?.type === 'measure' && <MeasureDialog incident={incident} onClose={close} onSaved={refresh} />}
      {dialog?.type === 'meeting' && <MeetingDialog incident={incident} meeting={dialog.meeting} onClose={close} onSaved={refresh} />}
      {dialog?.type === 'referral' && <ReferralDialog incident={incident} onClose={close} onSaved={refresh} />}
      {dialog?.type === 'remove' && (
        <RemoveDialog id={dialog.id} incident={incident} kind={dialog.kind} label={dialog.label} onClose={close} onSaved={refresh} />
      )}
    </div>
  )
}

export default IncidentCasePage
