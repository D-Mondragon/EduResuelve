import {
  ArrowRight,
  CheckCircle2,
  FileText,
  History,
  Info,
  Lock,
  MessageSquarePlus,
  Paperclip,
  PencilLine,
  Send,
  Sparkles,
  Workflow,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { IncidentHeader } from '../components/incident/IncidentHeader'
import { Timeline } from '../components/incident/Timeline'
import { useToast } from '../components/toast/toastContext'
import { Button, ButtonLink } from '../components/ui/Button'
import { Card, CardHeader, DetailItem, ErrorState, LoadingState } from '../components/ui/Feedback'
import { Textarea } from '../components/ui/Field'
import { useIncident } from '../hooks/useIncident'
import { api, ApiError } from '../lib/api'
import { formatDate, formatDateTime, pluralize } from '../lib/format'
import { can, nextStep } from '../lib/permissions'
import type { IncidentDetail } from '../types/incident'

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
          </>
        }
        incident={incident}
      />

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
