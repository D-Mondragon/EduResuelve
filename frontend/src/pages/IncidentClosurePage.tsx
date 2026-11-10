import { CheckCircle2, Lock, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { IncidentHeader } from '../components/incident/IncidentHeader'
import { useToast } from '../components/toast/toastContext'
import { Button, ButtonLink } from '../components/ui/Button'
import { Alert, Card, CardHeader, DetailItem, ErrorState, LoadingState } from '../components/ui/Feedback'
import { Field, Textarea } from '../components/ui/Field'
import { useIncident } from '../hooks/useIncident'
import { api, ApiError } from '../lib/api'
import { formatDate, formatDateTime } from '../lib/format'
import { can } from '../lib/permissions'

function IncidentClosurePage() {
  const { data: incident, error, loading, reload } = useIncident()
  const navigate = useNavigate()
  const { notify } = useToast()
  const [observations, setObservations] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  if (loading && !incident) return <LoadingState />
  if (error || !incident) return <ErrorState error={error ?? new Error('Incidencia no encontrada.')} onRetry={() => reload()} />

  const base = `/incidencias/${encodeURIComponent(incident.code)}`
  const allowed = can(incident, 'close')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!incident) return
    if (!confirmed) {
      setConfirmError('Confirma que la información es suficiente para cerrar.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      await api.close(incident.code, observations, confirmed)
      notify('Incidencia cerrada correctamente.')
      navigate(base)
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : 'No se pudo cerrar la incidencia.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <IncidentHeader incident={incident} section="Cierre" />

      {incident.resolution && (
        <Card>
          <CardHeader
            description={`Por ${incident.resolution.registeredBy?.fullName ?? '—'} · ${formatDate(incident.resolution.resolutionDate, 'long')}`}
            icon={CheckCircle2}
            title="Resolución a verificar"
          />
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2 sm:p-6">
            <DetailItem label="Resumen">{incident.resolution.summary}</DetailItem>
            <DetailItem label="Acciones realizadas">{incident.resolution.actionsTaken}</DetailItem>
            <DetailItem label="Resultado">{incident.resolution.result}</DetailItem>
            <DetailItem label="Observaciones">{incident.resolution.observations || 'Sin observaciones'}</DetailItem>
          </dl>
        </Card>
      )}

      {incident.closure ? (
        <Card>
          <CardHeader icon={Lock} title="Incidencia cerrada" />
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-3 sm:p-6">
            <DetailItem label="Cerrada por">{incident.closure.closedBy?.fullName ?? '—'}</DetailItem>
            <DetailItem label="Fecha de cierre">{formatDateTime(incident.closure.closedAt)}</DetailItem>
            <DetailItem label="Observaciones">{incident.closure.observations || 'Sin observaciones'}</DetailItem>
          </dl>
        </Card>
      ) : !allowed ? (
        <Alert tone="info" title="Cierre no disponible">
          {incident.status === 'Resuelto'
            ? 'Solo un Orientador o Administrador puede cerrar incidencias.'
            : 'La incidencia debe estar en estado "Resuelto" para poder cerrarse.'}
        </Alert>
      ) : (
        <Card>
          <CardHeader description="Verifica la resolución y confirma el cierre (RN-006)." icon={Lock} title="Confirmar cierre" />
          <form className="space-y-5 p-5 sm:p-6" noValidate onSubmit={handleSubmit}>
            <Field counter={[observations.length, 1000]} hint="Opcional." id="closure-observations" label="Observaciones de cierre">
              <Textarea maxLength={1000} onChange={(e) => setObservations(e.target.value)} value={observations} />
            </Field>
            <div>
              <label className="flex items-start gap-3 rounded-lg border border-line p-3.5 text-sm leading-6 text-ink-2" htmlFor="closure-confirmation">
                <input
                  aria-describedby={confirmError ? 'closure-confirmation-error' : undefined}
                  aria-invalid={confirmError ? true : undefined}
                  checked={confirmed}
                  className="mt-1 size-4 shrink-0 accent-emerald-700"
                  id="closure-confirmation"
                  onChange={(e) => {
                    setConfirmed(e.target.checked)
                    setConfirmError('')
                  }}
                  type="checkbox"
                />
                Confirmo que revisé la resolución y que la información es suficiente para cerrar esta incidencia.
              </label>
              {confirmError && (
                <p className="mt-1.5 text-sm text-rose-700 dark:text-rose-400" id="closure-confirmation-error">
                  {confirmError}
                </p>
              )}
            </div>
            {formError && <Alert tone="error">{formError}</Alert>}
            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
              <ButtonLink icon={X} to={base} variant="secondary">
                Cancelar
              </ButtonLink>
              <Button icon={Lock} loading={saving} type="submit">
                Cerrar incidencia
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}

export default IncidentClosurePage
