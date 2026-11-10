import { FilePlus2, Info, PencilLine, Save, ShieldAlert, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useToast } from '../components/toast/toastContext'
import { Button, ButtonLink } from '../components/ui/Button'
import { Alert, Card, ErrorState, LoadingState, PageHeader } from '../components/ui/Feedback'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { api, ApiError } from '../lib/api'
import { todayInLima } from '../lib/format'
import { validateIncidentForm, type IncidentFormErrors as Errors } from '../lib/validation'
import { can } from '../lib/permissions'
import {
  incidentCategories,
  incidentPriorities,
  type IncidentDetail,
  type IncidentFormData,
} from '../types/incident'

const empty: IncidentFormData = {
  title: '',
  description: '',
  category: '',
  priority: '',
  incidentDate: '',
  location: '',
  involvedPeople: '',
}

function toForm(incident: IncidentDetail): IncidentFormData {
  return {
    title: incident.title,
    description: incident.description,
    category: incident.category,
    priority: incident.priority,
    incidentDate: incident.incidentDate,
    location: incident.location,
    involvedPeople: incident.involvedPeople,
  }
}

const priorityHelp: Record<string, string> = {
  Baja: 'Puede atenderse en los próximos días.',
  Media: 'Requiere atención en la semana.',
  Alta: 'Requiere atención pronto (hoy o mañana).',
  Crítica: 'Riesgo para la seguridad o integridad: atención inmediata.',
}

function IncidentFormPage() {
  const { code } = useParams()
  const editing = Boolean(code)
  const navigate = useNavigate()
  const { notify } = useToast()
  const [values, setValues] = useState<IncidentFormData>(empty)
  const [initial, setInitial] = useState<IncidentFormData | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadState, setLoadState] = useState<{ loading: boolean; error?: Error; forbidden?: boolean }>({
    loading: editing,
  })

  useEffect(() => {
    if (!code) return
    let active = true
    api
      .getIncident(code)
      .then((incident) => {
        if (!active) return
        const form = toForm(incident)
        setValues(form)
        setInitial(form)
        setLoadState({ loading: false, forbidden: !can(incident, 'edit') })
      })
      .catch((error: Error) => active && setLoadState({ loading: false, error }))
    return () => {
      active = false
    }
  }, [code])

  function update<K extends keyof IncidentFormData>(key: K, value: IncidentFormData[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validateIncidentForm(values)
    setErrors(nextErrors)
    setFormError('')
    if (Object.keys(nextErrors).length > 0) {
      const firstKey = Object.keys(nextErrors)[0]
      document.getElementById(`incident-${firstKey}`)?.focus()
      return
    }
    setSaving(true)
    try {
      if (code) {
        await api.updateIncident(code, values)
        notify('Cambios guardados. La edición quedó registrada en el historial.')
        navigate(`/incidencias/${encodeURIComponent(code)}`)
      } else {
        const result = await api.createIncident(values)
        notify(`Incidencia ${result.code} registrada correctamente.`)
        navigate(`/incidencias/${encodeURIComponent(result.code)}`)
      }
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'No se pudo guardar la incidencia.')
    } finally {
      setSaving(false)
    }
  }

  if (loadState.loading) return <LoadingState />
  if (loadState.error) return <ErrorState error={loadState.error} />
  if (loadState.forbidden) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <Alert
          action={<ButtonLink to={`/incidencias/${encodeURIComponent(code ?? '')}`} variant="secondary" size="sm">Ver incidencia</ButtonLink>}
          title="No se puede editar"
          tone="warning"
        >
          Solo quien registró la incidencia o un gestor puede editarla, y únicamente en estado Nuevo o En revisión.
        </Alert>
      </div>
    )
  }

  const unchanged = initial !== null && JSON.stringify(initial) === JSON.stringify(values)
  const cancelTo = code ? `/incidencias/${encodeURIComponent(code)}` : '/incidencias'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        description={
          editing
            ? `Corrige la información de ${code}. Cada cambio queda registrado en el historial.`
            : 'Completa los datos para iniciar la gestión y seguimiento.'
        }
        icon={editing ? PencilLine : FilePlus2}
        title={editing ? 'Editar incidencia' : 'Registrar incidencia'}
      />

      {formError && <Alert tone="error">{formError}</Alert>}

      <Card>
        <form noValidate onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 p-5 sm:p-7 md:grid-cols-2">
            <Field
              className="md:col-span-2"
              counter={[values.title.length, 160]}
              error={errors.title}
              id="incident-title"
              label="Título"
              required
            >
              <Input
                autoComplete="off"
                maxLength={160}
                onChange={(e) => update('title', e.target.value)}
                placeholder="Ej.: Conflicto entre estudiantes en el patio"
                value={values.title}
              />
            </Field>

            <Field
              className="md:col-span-2"
              counter={[values.description.length, 2000]}
              error={errors.description}
              hint="Explica qué pasó, cuándo y cómo se detectó. Evita juicios y datos sensibles."
              id="incident-description"
              label="Descripción"
              required
            >
              <Textarea
                className="min-h-32"
                maxLength={2000}
                onChange={(e) => update('description', e.target.value)}
                value={values.description}
              />
            </Field>

            <Field error={errors.category} id="incident-category" label="Categoría" required>
              <Select onChange={(e) => update('category', e.target.value as IncidentFormData['category'])} value={values.category}>
                <option value="">Selecciona una categoría</option>
                {incidentCategories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </Select>
            </Field>

            <Field
              error={errors.priority}
              hint={values.priority ? priorityHelp[values.priority] : 'Indica qué tan urgente es la atención.'}
              id="incident-priority"
              label="Prioridad"
              required
            >
              <Select onChange={(e) => update('priority', e.target.value as IncidentFormData['priority'])} value={values.priority}>
                <option value="">Selecciona una prioridad</option>
                {incidentPriorities.map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </Select>
            </Field>

            <Field error={errors.incidentDate} id="incident-incidentDate" label="Fecha del incidente" required>
              <Input max={todayInLima()} onChange={(e) => update('incidentDate', e.target.value)} type="date" value={values.incidentDate} />
            </Field>

            <Field counter={[values.location.length, 160]} error={errors.location} id="incident-location" label="Lugar" required>
              <Input
                maxLength={160}
                onChange={(e) => update('location', e.target.value)}
                placeholder="Ej.: Patio central, Aula 4"
                value={values.location}
              />
            </Field>

            <Field
              className="md:col-span-2"
              counter={[values.involvedPeople.length, 200]}
              error={errors.involvedPeople}
              hint={
                <span className="inline-flex items-start gap-1.5">
                  <ShieldAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                  Protege a los menores: usa referencias generales (p. ej. “estudiantes de 2B”) y no incluyas DNI, direcciones ni datos de salud.
                </span>
              }
              id="incident-involvedPeople"
              label="Personas involucradas"
            >
              <Input
                maxLength={200}
                onChange={(e) => update('involvedPeople', e.target.value)}
                value={values.involvedPeople}
              />
            </Field>

            {!editing && (
              <div className="flex gap-3 rounded-lg border border-line bg-surface-2 p-4 text-sm md:col-span-2">
                <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                <p className="leading-6 text-ink-2">
                  La incidencia se registrará en estado <strong>Nuevo</strong> y el sistema le asignará un código
                  (ER-AAAA-XXXX). Después podrás adjuntar evidencias desde su detalle.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            <ButtonLink icon={X} to={cancelTo} variant="secondary">
              Cancelar
            </ButtonLink>
            <Button disabled={editing && unchanged} icon={editing ? Save : FilePlus2} loading={saving} type="submit">
              {editing ? 'Guardar cambios' : 'Registrar incidencia'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default IncidentFormPage
