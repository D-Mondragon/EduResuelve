import { CheckCircle2, ClipboardCheck, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { IncidentHeader } from '../components/incident/IncidentHeader'
import { useToast } from '../components/toast/toastContext'
import { Button, ButtonLink } from '../components/ui/Button'
import { Alert, Card, CardHeader, DetailItem, ErrorState, LoadingState } from '../components/ui/Feedback'
import { Field, Input, Textarea } from '../components/ui/Field'
import { useIncident } from '../hooks/useIncident'
import { api, ApiError } from '../lib/api'
import { formatDate, formatDateTime, todayInLima } from '../lib/format'
import { can } from '../lib/permissions'
import type { ResolutionFormData } from '../types/incident'

function IncidentResolutionPage() {
  const { data: incident, error, loading, reload } = useIncident()
  const navigate = useNavigate()
  const { notify } = useToast()
  const [values, setValues] = useState<ResolutionFormData>({
    summary: '',
    actionsTaken: '',
    result: '',
    observations: '',
    resolutionDate: todayInLima(),
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ResolutionFormData, string>>>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  if (loading && !incident) return <LoadingState />
  if (error || !incident) return <ErrorState error={error ?? new Error('Incidencia no encontrada.')} onRetry={() => reload()} />

  const base = `/incidencias/${encodeURIComponent(incident.code)}`
  const allowed = can(incident, 'resolve')

  function update<K extends keyof ResolutionFormData>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!incident) return
    const nextErrors: typeof errors = {}
    if (!values.summary.trim()) nextErrors.summary = 'Ingresa un resumen de la resolución.'
    if (!values.actionsTaken.trim()) nextErrors.actionsTaken = 'Describe las acciones realizadas.'
    if (!values.result.trim()) nextErrors.result = 'Describe el resultado de la atención.'
    if (!values.resolutionDate) nextErrors.resolutionDate = 'Selecciona la fecha de resolución.'
    else if (values.resolutionDate < incident.incidentDate)
      nextErrors.resolutionDate = 'No puede ser anterior a la fecha del incidente.'
    else if (values.resolutionDate > todayInLima()) nextErrors.resolutionDate = 'No puede ser una fecha futura.'
    setErrors(nextErrors)
    setFormError('')
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    try {
      await api.resolve(incident.code, values)
      notify('Resolución registrada. La incidencia pasó a "Resuelto".')
      navigate(base)
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : 'No se pudo registrar la resolución.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <IncidentHeader incident={incident} section="Resolución" />

      {incident.resolution ? (
        <Card>
          <CardHeader
            description={`Registrada por ${incident.resolution.registeredBy?.fullName ?? '—'} · ${formatDateTime(incident.resolution.registeredAt)}`}
            icon={CheckCircle2}
            title="Resolución registrada"
          />
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2 sm:p-6">
            <DetailItem label="Resumen">{incident.resolution.summary}</DetailItem>
            <DetailItem label="Fecha de resolución">{formatDate(incident.resolution.resolutionDate, 'long')}</DetailItem>
            <DetailItem label="Acciones realizadas">{incident.resolution.actionsTaken}</DetailItem>
            <DetailItem label="Resultado">{incident.resolution.result}</DetailItem>
            <DetailItem label="Observaciones">{incident.resolution.observations || 'Sin observaciones'}</DetailItem>
          </dl>
        </Card>
      ) : !allowed ? (
        <Alert tone="info" title="Resolución no disponible">
          {incident.status === 'En atención'
            ? 'Solo el responsable asignado o un Administrador puede registrar la resolución.'
            : 'La resolución se registra cuando la incidencia está "En atención".'}
        </Alert>
      ) : (
        <Card>
          <CardHeader
            description="Documenta lo realizado para que la incidencia pueda cerrarse (RN-005)."
            icon={ClipboardCheck}
            title="Registrar resolución"
          />
          <form noValidate onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-2">
              <Field className="md:col-span-2" counter={[values.summary.length, 1000]} error={errors.summary} id="summary" label="Resumen de la resolución" required>
                <Textarea maxLength={1000} onChange={(e) => update('summary', e.target.value)} value={values.summary} />
              </Field>
              <Field className="md:col-span-2" counter={[values.actionsTaken.length, 2000]} error={errors.actionsTaken} id="actions" label="Acciones realizadas" required>
                <Textarea className="min-h-28" maxLength={2000} onChange={(e) => update('actionsTaken', e.target.value)} value={values.actionsTaken} />
              </Field>
              <Field className="md:col-span-2" counter={[values.result.length, 2000]} error={errors.result} id="result" label="Resultado de la atención" required>
                <Textarea maxLength={2000} onChange={(e) => update('result', e.target.value)} value={values.result} />
              </Field>
              <Field error={errors.resolutionDate} id="resolution-date" label="Fecha de resolución" required>
                <Input
                  max={todayInLima()}
                  min={incident.incidentDate}
                  onChange={(e) => update('resolutionDate', e.target.value)}
                  type="date"
                  value={values.resolutionDate}
                />
              </Field>
              <Field hint="Opcional." id="resolution-observations" label="Observaciones finales">
                <Textarea maxLength={1000} onChange={(e) => update('observations', e.target.value)} value={values.observations} />
              </Field>
            </div>
            {formError && (
              <div className="px-5 pb-4 sm:px-6">
                <Alert tone="error">{formError}</Alert>
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <ButtonLink icon={X} to={base} variant="secondary">
                Cancelar
              </ButtonLink>
              <Button icon={CheckCircle2} loading={saving} type="submit">
                Registrar resolución
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}

export default IncidentResolutionPage
