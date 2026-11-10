import { useState } from 'react'
import { Link } from 'react-router'

const categories = [
  'Convivencia',
  'Académica',
  'Infraestructura',
  'Orientación',
  'Administrativa',
] as const

const priorities = ['Baja', 'Media', 'Alta', 'Crítica'] as const

type IncidentCategory = '' | (typeof categories)[number]
type IncidentPriority = '' | (typeof priorities)[number]

interface IncidentFormValues {
  title: string
  description: string
  category: IncidentCategory
  priority: IncidentPriority
  incidentDate: string
  location: string
  involvedPeople: string
}

type IncidentFormErrors = Partial<Record<keyof IncidentFormValues, string>>

const initialValues: IncidentFormValues = {
  title: '',
  description: '',
  category: '',
  priority: '',
  incidentDate: '',
  location: '',
  involvedPeople: '',
}

const inputClassName =
  'mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20'

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null

  return (
    <p className="mt-1.5 text-sm text-rose-700" id={id}>
      {message}
    </p>
  )
}

function NewIncidentPage() {
  const [values, setValues] = useState<IncidentFormValues>(initialValues)
  const [errors, setErrors] = useState<IncidentFormErrors>({})
  const [submitMessage, setSubmitMessage] = useState('')

  function updateField<Field extends keyof IncidentFormValues>(
    field: Field,
    value: IncidentFormValues[Field],
  ) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSubmitMessage('')
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: IncidentFormErrors = {}
    if (!values.title.trim()) {
      nextErrors.title = 'Ingresa el título de la incidencia.'
    }
    if (!values.description.trim()) {
      nextErrors.description = 'Describe lo ocurrido.'
    }
    if (!values.category) {
      nextErrors.category = 'Selecciona una categoría.'
    }
    if (!values.priority) {
      nextErrors.priority = 'Selecciona una prioridad.'
    }
    if (!values.incidentDate) {
      nextErrors.incidentDate = 'Selecciona la fecha del incidente.'
    }
    if (!values.location.trim()) {
      nextErrors.location = 'Indica el lugar del incidente.'
    }
    if (values.involvedPeople.length > 200) {
      nextErrors.involvedPeople = 'Utiliza un máximo de 200 caracteres.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setSubmitMessage('')
      return
    }

    setSubmitMessage(
      'La incidencia está lista para ser registrada. La persistencia se implementará cuando se conecte el backend.',
    )
  }

  return (
    <section className="mx-auto w-full max-w-4xl">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Nueva incidencia
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
          Registra una nueva incidencia para iniciar su gestión y seguimiento.
        </p>
      </header>

      <form
        className="rounded-lg border border-slate-200 bg-white shadow-sm"
        noValidate
        onSubmit={handleSubmit}
      >
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 p-5 sm:p-7 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="incident-title"
            >
              Título de la incidencia <span className="text-rose-700">*</span>
            </label>
            <input
              aria-describedby={errors.title ? 'incident-title-error' : undefined}
              aria-invalid={Boolean(errors.title)}
              autoComplete="off"
              className={inputClassName}
              id="incident-title"
              maxLength={160}
              name="title"
              onChange={(event) => updateField('title', event.target.value)}
              required
              value={values.title}
            />
            <FieldError id="incident-title-error" message={errors.title} />
          </div>

          <div className="md:col-span-2">
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="incident-description"
            >
              Descripción <span className="text-rose-700">*</span>
            </label>
            <textarea
              aria-describedby={
                errors.description ? 'incident-description-error' : undefined
              }
              aria-invalid={Boolean(errors.description)}
              autoComplete="off"
              className={`${inputClassName} min-h-32 resize-y leading-6`}
              id="incident-description"
              maxLength={2000}
              name="description"
              onChange={(event) =>
                updateField('description', event.target.value)
              }
              placeholder="Describe con claridad qué ocurrió..."
              required
              value={values.description}
            />
            <FieldError
              id="incident-description-error"
              message={errors.description}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="incident-category"
            >
              Categoría <span className="text-rose-700">*</span>
            </label>
            <select
              aria-describedby={
                errors.category ? 'incident-category-error' : undefined
              }
              aria-invalid={Boolean(errors.category)}
              className={inputClassName}
              id="incident-category"
              name="category"
              onChange={(event) =>
                updateField(
                  'category',
                  event.target.value as IncidentCategory,
                )
              }
              required
              value={values.category}
            >
              <option value="">Seleccionar categoría</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <FieldError
              id="incident-category-error"
              message={errors.category}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="incident-priority"
            >
              Prioridad <span className="text-rose-700">*</span>
            </label>
            <select
              aria-describedby={
                errors.priority ? 'incident-priority-error' : undefined
              }
              aria-invalid={Boolean(errors.priority)}
              className={inputClassName}
              id="incident-priority"
              name="priority"
              onChange={(event) =>
                updateField(
                  'priority',
                  event.target.value as IncidentPriority,
                )
              }
              required
              value={values.priority}
            >
              <option value="">Seleccionar prioridad</option>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
            <FieldError
              id="incident-priority-error"
              message={errors.priority}
            />
            <p className="mt-1.5 text-xs leading-5 text-slate-500">
              La prioridad se selecciona manualmente para este prototipo.
            </p>
          </div>

          <div>
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="incident-date"
            >
              Fecha del incidente <span className="text-rose-700">*</span>
            </label>
            <input
              aria-describedby={
                errors.incidentDate ? 'incident-date-error' : undefined
              }
              aria-invalid={Boolean(errors.incidentDate)}
              autoComplete="off"
              className={inputClassName}
              id="incident-date"
              name="incidentDate"
              onChange={(event) =>
                updateField('incidentDate', event.target.value)
              }
              required
              type="date"
              value={values.incidentDate}
            />
            <FieldError
              id="incident-date-error"
              message={errors.incidentDate}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="incident-location"
            >
              Lugar <span className="text-rose-700">*</span>
            </label>
            <input
              aria-describedby={
                errors.location ? 'incident-location-error' : undefined
              }
              aria-invalid={Boolean(errors.location)}
              autoComplete="off"
              className={inputClassName}
              id="incident-location"
              maxLength={160}
              name="location"
              onChange={(event) => updateField('location', event.target.value)}
              required
              value={values.location}
            />
            <FieldError
              id="incident-location-error"
              message={errors.location}
            />
          </div>

          <div className="md:col-span-2">
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="incident-involved-people"
            >
              Personas involucradas
            </label>
            <input
              aria-describedby="incident-involved-people-help"
              autoComplete="off"
              className={inputClassName}
              id="incident-involved-people"
              maxLength={200}
              name="involvedPeople"
              onChange={(event) =>
                updateField('involvedPeople', event.target.value)
              }
              value={values.involvedPeople}
            />
            <p
              className="mt-1.5 text-xs leading-5 text-slate-500"
              id="incident-involved-people-help"
            >
              Campo temporal, hasta 200 caracteres. Evita incluir información
              innecesaria.
            </p>
            <FieldError
              id="incident-involved-people-error"
              message={errors.involvedPeople}
            />
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 md:col-span-2">
            <p className="text-sm font-medium text-slate-800">
              Estado inicial: <span className="text-emerald-800">Nuevo</span>
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Las incidencias registradas ingresan inicialmente en estado
              Nuevo.
            </p>
            <p className="mt-3 text-xs leading-5 text-slate-600">
              El código de la incidencia será generado por el sistema al
              registrar la incidencia.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <Link
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
            to="/incidencias"
          >
            Cancelar
          </Link>
          <button
            className="inline-flex items-center justify-center rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            type="submit"
          >
            Registrar incidencia
          </button>
        </div>

        {submitMessage && (
          <p
            aria-live="polite"
            className="mx-5 mb-5 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-900 sm:mx-7"
            role="status"
          >
            {submitMessage}
          </p>
        )}
      </form>
    </section>
  )
}

export default NewIncidentPage