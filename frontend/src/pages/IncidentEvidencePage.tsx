import { useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { mockEvidences } from '../data/mockIncidents'
import { useIncidentSession } from '../store/incidentSession'
import type {
  Evidence,
  EvidenceType,
  IncidentPriority,
  IncidentStatus,
} from '../types/incident'

interface SelectedFile {
  name: string
  mimeType: string
  size: number
}

type EvidenceFormErrors = {
  file?: string
  evidenceType?: string
  description?: string
}

const evidenceTypes: EvidenceType[] = [
  'Documento',
  'Imagen',
  'Captura de pantalla',
  'Informe',
  'Otro',
]

const statusStyles: Record<IncidentStatus, string> = {
  Nuevo: 'bg-sky-50 text-sky-800',
  'En revisión': 'bg-blue-50 text-blue-800',
  Asignado: 'bg-indigo-50 text-indigo-800',
  'En atención': 'bg-amber-50 text-amber-800',
  Resuelto: 'bg-emerald-50 text-emerald-800',
  Cerrado: 'bg-slate-100 text-slate-700',
  Descartado: 'bg-slate-100 text-slate-600',
}

const priorityStyles: Record<IncidentPriority, string> = {
  Baja: 'bg-slate-100 text-slate-700',
  Media: 'bg-blue-50 text-blue-800',
  Alta: 'bg-orange-50 text-orange-800',
  Crítica: 'bg-rose-50 text-rose-800',
}

const dateTimeFormatter = new Intl.DateTimeFormat('es', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
})

const fieldClassName =
  'mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20'

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null

  return (
    <p className="mt-1.5 text-sm text-rose-700" id={id}>
      {message}
    </p>
  )
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`

  const units = ['KB', 'MB', 'GB']
  let value = size / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toLocaleString('es', { maximumFractionDigits: 1 })} ${units[unitIndex]}`
}

function IncidentEvidencePage() {
  const { id } = useParams()
  const { incidents } = useIncidentSession()
  const incident = incidents.find((item) => item.id === id)
  const [evidences, setEvidences] = useState<Evidence[]>(() => [...mockEvidences])
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null)
  const [evidenceType, setEvidenceType] = useState<EvidenceType | ''>('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<EvidenceFormErrors>({})
  const [confirmation, setConfirmation] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!incident) {
    return (
      <section className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-start justify-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Incidencia no encontrada
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          No encontramos una incidencia con el código solicitado.
        </p>
        <Link
          className="mt-6 inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
          to="/incidencias"
        >
          Volver a incidencias
        </Link>
      </section>
    )
  }

  const incidentId = incident.id
  const incidentEvidence = evidences.filter(
    (evidence) => evidence.incidentId === incidentId,
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: EvidenceFormErrors = {}
    if (!selectedFile) nextErrors.file = 'Selecciona un archivo.'
    if (!evidenceType) nextErrors.evidenceType = 'Selecciona un tipo de evidencia.'
    if (description.trim().length < 10) {
      nextErrors.description = 'Escribe una descripción de al menos 10 caracteres.'
    }
    if (description.trim().length > 1000) {
      nextErrors.description = 'La descripción no puede superar 1000 caracteres.'
    }

    setErrors(nextErrors)
    setConfirmation('')
    if (Object.keys(nextErrors).length > 0 || !selectedFile || !evidenceType) {
      return
    }

    const newEvidence: Evidence = {
      id: Date.now(),
      incidentId,
      fileName: selectedFile.name,
      fileType: selectedFile.mimeType || 'Tipo MIME no disponible',
      evidenceType,
      fileSize: selectedFile.size,
      description: description.trim(),
      registeredAt: new Date().toISOString(),
      registeredBy: 'Usuario de prueba',
    }

    setEvidences((current) => [newEvidence, ...current])
    setSelectedFile(null)
    setEvidenceType('')
    setDescription('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    setConfirmation('La evidencia se agregó temporalmente a esta incidencia.')
  }

  function handleDelete(evidenceId: number) {
    setEvidences((current) =>
      current.filter((evidence) => evidence.id !== evidenceId),
    )
    setConfirmation('La evidencia se eliminó temporalmente de esta lista.')
  }

  return (
    <section className="mx-auto w-full max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          className="inline-flex w-fit rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          to={`/incidencias/${encodeURIComponent(incident.id)}`}
        >
          Volver a detalle
        </Link>
        <span className="text-sm font-semibold text-emerald-800">
          {incident.code}
        </span>
      </div>

      <header className="mt-4 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {incident.title}
        </h1>
        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${statusStyles[incident.status]}`}
          >
            {incident.status}
          </span>
          <span
            className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${priorityStyles[incident.priority]}`}
          >
            Prioridad {incident.priority}
          </span>
        </div>
      </header>

      <section
        aria-label="Resumen de la incidencia"
        className="mt-6 grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
      >
        <div>
          <p className="text-xs font-medium text-slate-500">Código</p>
          <p className="mt-1 text-sm font-medium text-slate-800">{incident.code}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Categoría</p>
          <p className="mt-1 text-sm text-slate-800">{incident.category}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Estado</p>
          <p className="mt-1 text-sm text-slate-800">{incident.status}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">Prioridad</p>
          <p className="mt-1 text-sm text-slate-800">{incident.priority}</p>
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="text-xs font-medium text-slate-500">Responsable</p>
          <p className="mt-1 text-sm leading-5 text-slate-800">
            {incident.responsible}
          </p>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
        <section>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Evidencias</h2>
            <span className="text-sm text-slate-500">
              {incidentEvidence.length}{' '}
              {incidentEvidence.length === 1 ? 'archivo' : 'archivos'}
            </span>
          </div>

          <ul className="mt-4 space-y-3">
            {incidentEvidence.map((evidence) => (
              <li
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                key={evidence.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-semibold text-slate-900">
                      {evidence.fileName}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {evidence.evidenceType} · {evidence.fileType} ·{' '}
                      {formatFileSize(evidence.fileSize)}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {evidence.description}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      {dateTimeFormatter.format(new Date(evidence.registeredAt))}
                      {' · '}
                      {evidence.registeredBy}
                    </p>
                  </div>
                  <button
                    aria-label={`Eliminar ${evidence.fileName}`}
                    className="inline-flex w-fit shrink-0 items-center rounded-md px-2.5 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                    onClick={() => handleDelete(evidence.id)}
                    type="button"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
            {incidentEvidence.length === 0 && (
              <li className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500">
                Todavía no hay evidencias para esta incidencia.
              </li>
            )}
          </ul>
        </section>

        <section className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Nueva evidencia
          </h2>
          <form
            className="mt-5 space-y-5"
            noValidate
            onSubmit={handleSubmit}
          >
            <div>
              <label
                className="block text-sm font-medium text-slate-700"
                htmlFor="evidence-file"
              >
                Archivo <span className="text-rose-700">*</span>
              </label>
              <input
                aria-describedby={errors.file ? 'evidence-file-error' : undefined}
                aria-invalid={Boolean(errors.file)}
                className={`${fieldClassName} file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700`}
                id="evidence-file"
                name="file"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0]
                  setSelectedFile(
                    file
                      ? {
                          name: file.name,
                          mimeType: file.type,
                          size: file.size,
                        }
                      : null,
                  )
                  setErrors((current) => ({ ...current, file: undefined }))
                  setConfirmation('')
                }}
                ref={fileInputRef}
                type="file"
              />
              <FieldError id="evidence-file-error" message={errors.file} />
              <p className="mt-1.5 text-xs leading-5 text-slate-500">
                El archivo no se sube; solo se conserva temporalmente su nombre,
                tipo y tamaño.
              </p>
            </div>

            <div>
              <label
                className="block text-sm font-medium text-slate-700"
                htmlFor="evidence-type"
              >
                Tipo de evidencia <span className="text-rose-700">*</span>
              </label>
              <select
                aria-describedby={
                  errors.evidenceType ? 'evidence-type-error' : undefined
                }
                aria-invalid={Boolean(errors.evidenceType)}
                className={fieldClassName}
                id="evidence-type"
                name="evidenceType"
                onChange={(event) => {
                  setEvidenceType(event.target.value as EvidenceType | '')
                  setErrors((current) => ({
                    ...current,
                    evidenceType: undefined,
                  }))
                  setConfirmation('')
                }}
                value={evidenceType}
              >
                <option value="">Seleccionar tipo</option>
                {evidenceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <FieldError
                id="evidence-type-error"
                message={errors.evidenceType}
              />
            </div>

            <div>
              <label
                className="block text-sm font-medium text-slate-700"
                htmlFor="evidence-description"
              >
                Descripción <span className="text-rose-700">*</span>
              </label>
              <textarea
                aria-describedby={
                  errors.description
                    ? 'evidence-description-error evidence-description-help'
                    : 'evidence-description-help'
                }
                aria-invalid={Boolean(errors.description)}
                className={`${fieldClassName} min-h-28 resize-y leading-6`}
                id="evidence-description"
                maxLength={1000}
                minLength={10}
                name="description"
                onChange={(event) => {
                  setDescription(event.target.value)
                  setErrors((current) => ({ ...current, description: undefined }))
                  setConfirmation('')
                }}
                required
                value={description}
              />
              <FieldError
                id="evidence-description-error"
                message={errors.description}
              />
              <p
                className="mt-1.5 text-xs text-slate-500"
                id="evidence-description-help"
              >
                Entre 10 y 1000 caracteres.
              </p>
            </div>

            <button
              className="inline-flex w-full items-center justify-center rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
              type="submit"
            >
              Agregar evidencia
            </button>
          </form>
        </section>
      </div>

      <div className="mt-6 space-y-3">
        {confirmation && (
          <p
            aria-live="polite"
            className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"
            role="status"
          >
            {confirmation}
          </p>
        )}
        <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
          Las evidencias se almacenan temporalmente. La carga y persistencia real
          se implementarán al conectar el backend.
        </p>
      </div>
    </section>
  )
}

export default IncidentEvidencePage