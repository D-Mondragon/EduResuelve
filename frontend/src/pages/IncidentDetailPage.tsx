import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileBadge,
  FileText,
  History,
  Info,
  Lock,
  MessageSquareHeart,
  MessageSquarePlus,
  Paperclip,
  PencilLine,
  Scale,
  Send,
  Sparkles,
  Workflow,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { IncidentHeader } from '../components/incident/IncidentHeader'
import { Timeline } from '../components/incident/Timeline'
import { RatingStars } from '../components/survey/Rating'
import { ratingLabels, speedLabels } from '../components/survey/labels'
import { useToast } from '../components/toast/toastContext'
import { Badge } from '../components/ui/Badge'
import { Button, ButtonLink } from '../components/ui/Button'
import { Card, CardHeader, DetailItem, ErrorState, LoadingState } from '../components/ui/Feedback'
import { Textarea } from '../components/ui/Field'
import { useIncident } from '../hooks/useIncident'
import { api, ApiError } from '../lib/api'
import { formatDate, formatDateTime, pluralize } from '../lib/format'
import { can, nextStep } from '../lib/permissions'
import type { ActaMeta } from '../types/acta'
import type { IncidentDetail, SurveyInfo } from '../types/incident'

/** Resultado de la encuesta de satisfacción (RN-012): visible para quien registró y para los gestores. */
function SurveyCard({ survey }: { survey: SurveyInfo }) {
  const response = survey.response
  return (
    <Card label="Satisfacción con la atención">
      <CardHeader
        description={
          response
            ? `Respondida por ${response.user?.fullName ?? 'quien registró'} el ${formatDateTime(response.createdAt)}`
            : survey.status === 'No aplica'
              ? 'No aplica: quien registró también atendió o cerró la incidencia.'
              : 'Pendiente de respuesta de quien registró la incidencia.'
        }
        icon={MessageSquareHeart}
        title="Satisfacción con la atención"
      />
      {response && (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-3 sm:p-6">
          <DetailItem label="Satisfacción general">
            <RatingStars label={ratingLabels[response.rating - 1]} value={response.rating} />
          </DetailItem>
          <DetailItem label="¿Se resolvió el problema?">{response.resolved}</DetailItem>
          <DetailItem label="Rapidez">
            <RatingStars label={speedLabels[response.speedRating - 1]} value={response.speedRating} />
          </DetailItem>
          {response.comment && (
            <div className="sm:col-span-3">
              <DetailItem label="Comentario">{response.comment}</DetailItem>
            </div>
          )}
        </dl>
      )}
    </Card>
  )
}

/** Acta de resolución vigente e historial de versiones (RN-011). */
function ActaCard({ base, actas }: { base: string; actas: ActaMeta[] }) {
  const current = actas.find((acta) => acta.status === 'Vigente')
  const previous = actas.filter((acta) => acta !== current)
  const link = (acta: ActaMeta) => `${base}/acta/${encodeURIComponent(acta.number)}`

  return (
    <Card label="Acta de resolución">
      <CardHeader
        description="Documento que deja constancia de lo actuado y las medidas tomadas"
        icon={FileBadge}
        title="Acta de resolución"
      />
      <div className="space-y-4 p-5 sm:p-6">
        {current ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold text-ink">{current.number}</span>
                <Badge
                  className={
                    current.kind === 'Definitiva'
                      ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300'
                  }
                >
                  {current.kind === 'Definitiva' ? 'Definitiva' : 'Provisional'}
                </Badge>
              </p>
              <p className="mt-1 text-sm text-muted">
                Emitida el {formatDateTime(current.issuedAt)}
                {current.kind === 'Provisional' && ' · se reemplazará por la definitiva al cerrar la incidencia'}
              </p>
            </div>
            <ButtonLink className="shrink-0" icon={FileBadge} to={link(current)}>
              Ver acta
            </ButtonLink>
          </div>
        ) : (
          <p className="text-sm text-muted">
            No hay un acta vigente: la incidencia fue reabierta. Se emitirá una nueva al volver a resolverla.
          </p>
        )}
        {previous.length > 0 && (
          <details className="group rounded-lg border border-line px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-ink-2">
              Versiones anteriores ({previous.length})
            </summary>
            <ul className="mt-3 space-y-2">
              {previous.map((acta) => (
                <li className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between" key={acta.number}>
                  <span className="min-w-0">
                    <Link className="font-mono font-medium text-emerald-700 hover:underline dark:text-emerald-400" to={link(acta)}>
                      {acta.number}
                    </Link>{' '}
                    <span className="text-muted">
                      · {acta.kind} · reemplazada el {formatDateTime(acta.replacedAt)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </Card>
  )
}

function ObservationForm({ incident, onSaved }: { incident: IncidentDetail; onSaved: () => void }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const { notify } = useToast()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!text.trim()) {
      setError('Escribe la observación antes de enviarla.')
      return
    }
    setSaving(true)
    try {
      await api.addObservation(incident.code, text)
      setText('')
      setError('')
      notify('Observación agregada al historial.')
      onSaved()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo guardar la observación.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="border-t border-line px-5 py-4 sm:px-6" noValidate onSubmit={handleSubmit}>
      <label className="flex items-center gap-2 text-sm font-medium text-ink-2" htmlFor="observation">
        <MessageSquarePlus aria-hidden="true" className="size-4" />
        Agregar observación
      </label>
      <Textarea
        aria-describedby={error ? 'observation-error' : undefined}
        aria-invalid={error ? true : undefined}
        className="mt-2 min-h-20"
        id="observation"
        maxLength={1000}
        onChange={(event) => {
          setText(event.target.value)
          setError('')
        }}
        placeholder="Comparte un avance, acuerdo o dato relevante…"
        value={text}
      />
      {error && (
        <p className="mt-1.5 text-sm text-rose-700 dark:text-rose-400" id="observation-error">
          {error}
        </p>
      )}
      <div className="mt-3 flex justify-end">
        <Button icon={Send} loading={saving} size="sm" type="submit">
          Publicar
        </Button>
      </div>
    </form>
  )
}

function IncidentDetailPage() {
  const { data: incident, error, loading, reload } = useIncident()

  if (loading && !incident) return <LoadingState />
  if (error || !incident) return <ErrorState error={error ?? new Error('Incidencia no encontrada.')} onRetry={() => reload()} />

  const base = `/incidencias/${encodeURIComponent(incident.code)}`
  const step = nextStep(incident)
  const activeEvidences = incident.evidences.filter((e) => e.status === 'Activa').length
  const currentActa = incident.actas.find((acta) => acta.status === 'Vigente')

  return (
    <div className="space-y-6">
      <IncidentHeader
        actions={
          <>
            {can(incident, 'edit') && (
              <ButtonLink icon={PencilLine} to={`${base}/editar`} variant="secondary">
                Editar
              </ButtonLink>
            )}
            <ButtonLink icon={Paperclip} to={`${base}/evidencias`} variant="secondary">
              Evidencias ({activeEvidences})
            </ButtonLink>
            <ButtonLink icon={Workflow} to={`${base}/seguimiento`} variant="secondary">
              Seguimiento
            </ButtonLink>
            {incident.case && (
              <ButtonLink icon={Scale} to={`${base}/convivencia`} variant="secondary">
                Convivencia
              </ButtonLink>
            )}
            {currentActa && (
              <ButtonLink icon={FileBadge} to={`${base}/acta/${encodeURIComponent(currentActa.number)}`} variant="secondary">
                Acta
              </ButtonLink>
            )}
          </>
        }
        incident={incident}
      />

      {can(incident, 'acknowledge') && (
        <section
          aria-label="Comunicación a Dirección"
          className="flex flex-col gap-4 rounded-xl border border-rose-200 bg-rose-50 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-rose-400/30 dark:bg-rose-400/10"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-rose-700 dark:text-rose-300" />
            <div>
              <p className="text-sm font-semibold text-rose-900 dark:text-rose-200">
                Falta {incident.case?.severity?.toLowerCase()} comunicada a Dirección
              </p>
              <p className="mt-0.5 text-sm text-rose-800 dark:text-rose-300/90">
                Revisa el caso y confirma que tomaste conocimiento. Las medidas por faltas graves las decide Dirección.
              </p>
            </div>
          </div>
          <ButtonLink className="shrink-0" icon={Scale} to={`${base}/convivencia`}>
            Revisar caso
          </ButtonLink>
        </section>
      )}

      {step ? (
        <section
          aria-label="Siguiente paso"
          className="flex flex-col gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-400/30 dark:bg-emerald-400/10"
        >
          <div className="flex items-start gap-3">
            <Sparkles aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Siguiente paso: {step.label}</p>
              <p className="mt-0.5 text-sm text-emerald-800 dark:text-emerald-300/90">{step.description}</p>
            </div>
          </div>
          <ButtonLink className="shrink-0" icon={ArrowRight} to={step.to}>
            {step.label}
          </ButtonLink>
        </section>
      ) : (
        incident.status !== 'Cerrado' &&
        incident.status !== 'Descartado' && (
          <section className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm text-ink-2">
            <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted" />
            <p>
              No tienes acciones pendientes en esta incidencia. Te avisaremos con una notificación cuando cambie de estado.
            </p>
          </section>
        )
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
        <Card className="p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <FileText aria-hidden="true" className="size-5 text-emerald-700 dark:text-emerald-400" />
            Descripción
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-ink-2">{incident.description}</p>
          <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-line pt-5 sm:grid-cols-2">
            <DetailItem label="Categoría">{incident.category}</DetailItem>
            <DetailItem label="Fecha del incidente">{formatDate(incident.incidentDate, 'long')}</DetailItem>
            <DetailItem label="Lugar">{incident.location}</DetailItem>
            <DetailItem label="Personas involucradas">{incident.involvedPeople || 'No especificado'}</DetailItem>
          </dl>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-base font-semibold text-ink">Gestión</h2>
          <dl className="mt-4 space-y-4">
            <DetailItem label="Responsable">
              {incident.responsible ? (
                <>
                  {incident.responsible.fullName}
                  <span className="block text-xs text-muted">
                    {incident.responsible.role} · {incident.responsible.email}
                  </span>
                </>
              ) : (
                <span className="text-muted">Pendiente de asignación</span>
              )}
            </DetailItem>
            <DetailItem label="Registrada por">
              {incident.reporter?.fullName ?? '—'}
              <span className="block text-xs text-muted">{formatDateTime(incident.registeredAt)}</span>
            </DetailItem>
            <DetailItem label="Última actualización">{formatDateTime(incident.updatedAt)}</DetailItem>
            <DetailItem label="Evidencias">{pluralize(activeEvidences, 'archivo activo', 'archivos activos')}</DetailItem>
          </dl>
        </Card>
      </div>

      {incident.resolution && (
        <Card>
          <CardHeader
            description={`Registrada por ${incident.resolution.registeredBy?.fullName ?? '—'} el ${formatDate(incident.resolution.resolutionDate, 'long')}`}
            icon={CheckCircle2}
            title="Resolución"
          />
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2 sm:p-6">
            <DetailItem label="Resumen">{incident.resolution.summary}</DetailItem>
            <DetailItem label="Acciones realizadas">{incident.resolution.actionsTaken}</DetailItem>
            <DetailItem label="Resultado">{incident.resolution.result}</DetailItem>
            <DetailItem label="Observaciones">{incident.resolution.observations || 'Sin observaciones'}</DetailItem>
          </dl>
        </Card>
      )}

      {incident.closure && (
        <Card>
          <CardHeader
            description={`Cerrada por ${incident.closure.closedBy?.fullName ?? '—'} el ${formatDateTime(incident.closure.closedAt)}`}
            icon={Lock}
            title="Cierre"
          />
          <p className="p-5 text-sm text-ink-2 sm:p-6">{incident.closure.observations || 'Sin observaciones de cierre.'}</p>
        </Card>
      )}

      {incident.actas.length > 0 && <ActaCard actas={incident.actas} base={base} />}

      {incident.survey && !can(incident, 'survey') && <SurveyCard survey={incident.survey} />}

      <Card>
        <CardHeader
          description="Registro inmutable de cada movimiento (RN-003 / RN-009)"
          icon={History}
          title="Historial"
        />
        <div className="p-5 sm:p-6">
          <Timeline entries={incident.followUps} newestFirst />
        </div>
        {can(incident, 'observe') && <ObservationForm incident={incident} onSaved={() => reload(true)} />}
      </Card>
    </div>
  )
}

export default IncidentDetailPage
