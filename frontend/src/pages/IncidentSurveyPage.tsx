import { CheckCircle2, MessageSquareHeart, Send, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { IncidentHeader } from '../components/incident/IncidentHeader'
import { RatingInput } from '../components/survey/Rating'
import { ratingLabels, speedLabels } from '../components/survey/labels'
import { useToast } from '../components/toast/toastContext'
import { Button, ButtonLink } from '../components/ui/Button'
import { Alert, Card, CardHeader, ErrorState, LoadingState } from '../components/ui/Feedback'
import { Field, Textarea } from '../components/ui/Field'
import { useIncident } from '../hooks/useIncident'
import { api, ApiError } from '../lib/api'
import { can } from '../lib/permissions'
import { cn } from '../lib/ui'
import { surveyResolvedOptions, type SurveyFormData } from '../types/incident'

type Errors = Partial<Record<'rating' | 'resolved' | 'speedRating', string>>

function IncidentSurveyPage() {
  const { data: incident, error, loading, reload } = useIncident()
  const navigate = useNavigate()
  const { notify } = useToast()
  const [form, setForm] = useState<SurveyFormData>({ rating: null, resolved: '', speedRating: null, comment: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  if (loading && !incident) return <LoadingState />
  if (error || !incident) return <ErrorState error={error ?? new Error('Incidencia no encontrada.')} onRetry={() => reload()} />

  const base = `/incidencias/${encodeURIComponent(incident.code)}`

  function update<K extends keyof SurveyFormData>(key: K, value: SurveyFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!incident) return
    const next: Errors = {}
    if (!form.rating) next.rating = 'Califica tu satisfacción general.'
    if (!form.resolved) next.resolved = 'Indica si se resolvió tu problema.'
    if (!form.speedRating) next.speedRating = 'Califica la rapidez de la atención.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSaving(true)
    setFormError('')
    try {
      await api.submitSurvey(incident.code, form)
      notify('¡Gracias! Tu opinión nos ayuda a mejorar la atención.')
      navigate(base)
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : 'No se pudo enviar la encuesta.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <IncidentHeader incident={incident} section="Encuesta de satisfacción" />

      {!can(incident, 'survey') ? (
        incident.survey?.status === 'Respondida' ? (
          <Alert title="Encuesta respondida" tone="success">
            Ya registraste tu evaluación de esta atención. ¡Gracias!
          </Alert>
        ) : (
          <Alert title="Encuesta no disponible" tone="info">
            La encuesta la responde quien registró la incidencia, una vez que fue cerrada.
          </Alert>
        )
      ) : (
        <Card>
          <CardHeader
            description="Son 3 preguntas y toma menos de un minuto. Tu respuesta no se puede modificar después de enviarla."
            icon={MessageSquareHeart}
            title="¿Cómo fue la atención de tu incidencia?"
          />
          <form className="space-y-6 p-5 sm:p-6" noValidate onSubmit={handleSubmit}>
            <RatingInput
              error={errors.rating}
              labels={ratingLabels}
              legend="1. ¿Qué tan satisfecho estás con la atención recibida?"
              name="rating"
              onChange={(value) => update('rating', value)}
              value={form.rating}
            />

            <fieldset aria-describedby={errors.resolved ? 'resolved-error' : undefined}>
              <legend className="text-sm font-medium text-ink-2">
                2. ¿Se resolvió tu problema? <span className="text-rose-600">*</span>
              </legend>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:max-w-md">
                {surveyResolvedOptions.map((option) => (
                  <label
                    className={cn(
                      'flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2.5 text-sm font-medium transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-emerald-600',
                      form.resolved === option
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200'
                        : 'border-line text-ink-2 hover:bg-surface-2',
                    )}
                    key={option}
                  >
                    <input
                      checked={form.resolved === option}
                      className="sr-only"
                      name="resolved"
                      onChange={() => update('resolved', option)}
                      type="radio"
                      value={option}
                    />
                    {option}
                  </label>
                ))}
              </div>
              {errors.resolved && (
                <p className="mt-1.5 text-sm text-rose-700 dark:text-rose-400" id="resolved-error">
                  {errors.resolved}
                </p>
              )}
            </fieldset>

            <RatingInput
              error={errors.speedRating}
              labels={speedLabels}
              legend="3. ¿Qué tan rápida fue la atención?"
              name="speedRating"
              onChange={(value) => update('speedRating', value)}
              value={form.speedRating}
            />

            <Field
              counter={[form.comment.length, 500]}
              hint="Opcional. ¿Qué podríamos mejorar?"
              id="survey-comment"
              label="Comentario"
            >
              <Textarea maxLength={500} onChange={(event) => update('comment', event.target.value)} value={form.comment} />
            </Field>

            {formError && <Alert tone="error">{formError}</Alert>}
            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
              <ButtonLink icon={X} to={base} variant="secondary">
                Ahora no
              </ButtonLink>
              <Button icon={Send} loading={saving} type="submit">
                Enviar evaluación
              </Button>
            </div>
          </form>
        </Card>
      )}

      {incident.survey?.status === 'Respondida' && (
        <ButtonLink icon={CheckCircle2} to={base} variant="secondary">
          Volver a la incidencia
        </ButtonLink>
      )}
    </div>
  )
}

export default IncidentSurveyPage
