import {
  Ban,
  Download,
  Eye,
  FileImage,
  FileText,
  FileType2,
  Paperclip,
  Trash2,
  Upload,
  UploadCloud,
  Zap,
} from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { IncidentHeader } from '../components/incident/IncidentHeader'
import { useToast } from '../components/toast/toastContext'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Alert, Card, CardHeader, EmptyState, ErrorState, LoadingState } from '../components/ui/Feedback'
import { Field, Select, Textarea } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { useIncident } from '../hooks/useIncident'
import { api, ApiError } from '../lib/api'
import {
  acceptAttribute,
  base64ToBytes,
  MAX_EVIDENCES,
  prepareFile,
  saveBlob,
  splitIntoChunks,
  type PreparedFile,
} from '../lib/files'
import { formatBytes, formatDateTime } from '../lib/format'
import { can } from '../lib/permissions'
import { cn } from '../lib/ui'
import { evidenceTypes, type Evidence, type EvidenceType } from '../types/incident'

function FileIcon({ mime, className }: { mime: string | null; className: string }) {
  if (!mime) return <UploadCloud aria-hidden="true" className={className} />
  if (mime.startsWith('image/')) return <FileImage aria-hidden="true" className={className} />
  if (mime === 'application/pdf') return <FileText aria-hidden="true" className={className} />
  return <FileType2 aria-hidden="true" className={className} />
}

async function downloadEvidence(evidence: Evidence): Promise<Blob> {
  const parts: Uint8Array<ArrayBuffer>[] = []
  for (let idx = 0; idx < evidence.chunkCount; idx++) {
    parts.push(base64ToBytes(await api.evidenceChunkGet(evidence.id, idx)))
  }
  return new Blob(parts, { type: evidence.mimeType })
}

function UploadForm({ code, remaining, onUploaded }: { code: string; remaining: number; onUploaded: () => void }) {
  const { notify } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [prepared, setPrepared] = useState<PreparedFile | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [fileError, setFileError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [evidenceType, setEvidenceType] = useState<EvidenceType | ''>('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [progress, setProgress] = useState<number | null>(null)
  const [formError, setFormError] = useState('')

  async function handleFile(file: File | undefined) {
    if (!file) return
    setFileError('')
    setPrepared(null)
    setPreparing(true)
    const result = await prepareFile(file)
    setPreparing(false)
    if (!result.ok) {
      setFileError(result.message)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setPrepared(result.file)
    setErrors((current) => ({ ...current, file: '' }))
    if (!evidenceType) setEvidenceType(result.file.mimeType.startsWith('image/') ? 'Imagen' : 'Documento')
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    void handleFile(event.dataTransfer.files[0])
  }

  function reset() {
    setPrepared(null)
    setEvidenceType('')
    setDescription('')
    setErrors({})
    setProgress(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!prepared) nextErrors.file = 'Selecciona un archivo.'
    if (!evidenceType) nextErrors.type = 'Selecciona el tipo de evidencia.'
    if (!description.trim()) nextErrors.description = 'Describe brevemente qué contiene el archivo.'
    setErrors(nextErrors)
    setFormError('')
    if (Object.keys(nextErrors).length > 0 || !prepared) return

    try {
      setProgress(0)
      const chunks = await splitIntoChunks(prepared.blob)
      const { id } = await api.evidenceBegin(code, {
        fileName: prepared.fileName,
        mimeType: prepared.mimeType,
        sizeBytes: prepared.blob.size,
        originalSizeBytes: prepared.originalSize,
        compressed: prepared.compressed,
        evidenceType,
        description,
      })
      for (let idx = 0; idx < chunks.length; idx++) {
        await api.evidenceChunk(id, idx, chunks[idx])
        setProgress(Math.round(((idx + 1) / chunks.length) * 100))
      }
      await api.evidenceFinish(id)
      notify(`Evidencia "${prepared.fileName}" agregada.`)
      reset()
      onUploaded()
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : 'No se pudo subir el archivo. Intenta nuevamente.')
      setProgress(null)
    }
  }

  const uploading = progress !== null

  return (
    <form className="space-y-5 p-5 sm:p-6" noValidate onSubmit={handleSubmit}>
      <div>
        <p className="text-sm font-medium text-ink-2">
          Archivo <span className="text-rose-600" aria-hidden="true">*</span>
        </p>
        <div
          className={cn(
            'mt-1.5 flex flex-col items-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition',
            dragging ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-400/10' : 'border-line',
            errors.file || fileError ? 'border-rose-400' : '',
          )}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDrop={onDrop}
        >
          <FileIcon className="size-8 text-muted" mime={prepared?.mimeType ?? null} />
          {prepared ? (
            <div className="mt-2 text-sm">
              <p className="font-medium break-all text-ink">{prepared.fileName}</p>
              <p className="mt-0.5 text-muted">
                {prepared.compressed ? (
                  <span className="inline-flex flex-wrap items-center justify-center gap-1">
                    <Zap aria-hidden="true" className="size-3.5 text-emerald-600" />
                    Comprimida: {formatBytes(prepared.originalSize)} → {formatBytes(prepared.blob.size)} (
                    {Math.round((1 - prepared.blob.size / prepared.originalSize) * 100)}% menos)
                  </span>
                ) : (
                  formatBytes(prepared.blob.size)
                )}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-ink-2">
              {preparing ? 'Preparando archivo…' : 'Arrastra un archivo aquí o'}
            </p>
          )}
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink-2 shadow-sm hover:bg-surface-2 focus-within:outline-2 focus-within:outline-emerald-600">
            <Upload aria-hidden="true" className="size-4" />
            {prepared ? 'Cambiar archivo' : 'Seleccionar archivo'}
            <input
              accept={acceptAttribute}
              aria-describedby="file-hint"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => void handleFile(event.target.files?.[0])}
              ref={inputRef}
              type="file"
            />
          </label>
          <p className="mt-3 text-xs leading-5 text-muted" id="file-hint">
            PDF, JPG, PNG o DOCX · máximo 10 MB. Las imágenes se comprimen automáticamente.
          </p>
        </div>
        {(fileError || errors.file) && (
          <Alert className="mt-2" tone="error">
            {fileError || errors.file}
          </Alert>
        )}
      </div>

      <Field error={errors.type} id="evidence-type" label="Tipo de evidencia" required>
        <Select onChange={(e) => setEvidenceType(e.target.value as EvidenceType)} value={evidenceType}>
          <option value="">Selecciona el tipo</option>
          {evidenceTypes.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </Select>
      </Field>

      <Field counter={[description.length, 500]} error={errors.description} id="evidence-description" label="Descripción" required>
        <Textarea
          className="min-h-20"
          maxLength={500}
          onChange={(e) => {
            setDescription(e.target.value)
            setErrors((c) => ({ ...c, description: '' }))
          }}
          placeholder="Ej.: Foto de la zona afectada tomada el día del incidente"
          value={description}
        />
      </Field>

      {formError && <Alert tone="error">{formError}</Alert>}

      {uploading && (
        <div>
          <div className="flex justify-between text-xs text-muted">
            <span>Subiendo…</span>
            <span>{progress}%</span>
          </div>
          <div
            aria-label="Progreso de carga"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress ?? 0}
            className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
          >
            <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">Puedes agregar {remaining} más.</p>
        <Button disabled={preparing} icon={Upload} loading={uploading} type="submit">
          Subir evidencia
        </Button>
      </div>
    </form>
  )
}

function IncidentEvidencePage() {
  const { data: incident, error, loading, reload } = useIncident()
  const { notify } = useToast()
  const [busyId, setBusyId] = useState<number | null>(null)
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null)
  const [voiding, setVoiding] = useState<Evidence | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [voidError, setVoidError] = useState('')
  const [voidSaving, setVoidSaving] = useState(false)

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url)
    }
  }, [preview])

  if (loading && !incident) return <LoadingState />
  if (error || !incident) return <ErrorState error={error ?? new Error('Incidencia no encontrada.')} onRetry={() => reload()} />

  const active = incident.evidences.filter((e) => e.status === 'Activa')
  const remaining = Math.max(0, MAX_EVIDENCES - active.length)

  async function open(evidence: Evidence, mode: 'download' | 'preview') {
    setBusyId(evidence.id)
    try {
      const blob = await downloadEvidence(evidence)
      if (mode === 'preview') setPreview({ url: URL.createObjectURL(blob), name: evidence.fileName })
      else saveBlob(blob, evidence.fileName)
    } catch (caught) {
      notify(caught instanceof ApiError ? caught.message : 'No se pudo descargar el archivo.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function confirmVoid() {
    if (!voiding) return
    if (!voidReason.trim()) {
      setVoidError('Debe indicar el motivo de la anulación.')
      return
    }
    setVoidSaving(true)
    try {
      await api.evidenceVoid(voiding.id, voidReason)
      notify('Evidencia anulada. Se conserva en el historial.')
      setVoiding(null)
      reload(true)
    } catch (caught) {
      setVoidError(caught instanceof ApiError ? caught.message : 'No se pudo anular la evidencia.')
    } finally {
      setVoidSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <IncidentHeader incident={incident} section="Evidencias" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(20rem,1fr)]">
        <Card>
          <CardHeader
            description={`${active.length} de ${MAX_EVIDENCES} evidencias activas`}
            icon={Paperclip}
            title="Archivos de la incidencia"
          />
          {incident.evidences.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                description="Adjunta documentos, fotos o capturas que respalden la incidencia."
                icon={Paperclip}
                title="Sin evidencias"
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {incident.evidences.map((evidence) => {
                const isVoid = evidence.status === 'Anulada'
                return (
                  <li className={cn('flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:px-6', isVoid && 'opacity-70')} key={evidence.id}>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                      <FileIcon className="size-5" mime={evidence.mimeType} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cn('font-medium break-all text-ink', isVoid && 'line-through')}>{evidence.fileName}</p>
                        <Badge className="bg-surface-2 text-ink-2 ring-line">{evidence.evidenceType}</Badge>
                        {isVoid && (
                          <Badge className="bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-300">
                            Anulada
                          </Badge>
                        )}
                        {evidence.compressed && (
                          <Badge className="bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300">
                            <Zap aria-hidden="true" className="size-3" /> Comprimida
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-ink-2">{evidence.description}</p>
                      <p className="mt-1 text-xs text-muted">
                        {formatBytes(evidence.sizeBytes)} · {evidence.uploadedBy?.fullName ?? '—'} · {formatDateTime(evidence.uploadedAt)}
                      </p>
                      {isVoid && (
                        <p className="mt-1 text-xs text-rose-700 dark:text-rose-400">
                          Anulada por {evidence.voidedBy?.fullName ?? '—'} ({formatDateTime(evidence.voidedAt)}): {evidence.voidReason}
                        </p>
                      )}
                    </div>
                    {!isVoid && (
                      <div className="flex shrink-0 flex-wrap gap-1.5">
                        {evidence.mimeType.startsWith('image/') && (
                          <Button
                            aria-label={`Ver ${evidence.fileName}`}
                            icon={Eye}
                            loading={busyId === evidence.id}
                            onClick={() => void open(evidence, 'preview')}
                            size="sm"
                            variant="secondary"
                          >
                            Ver
                          </Button>
                        )}
                        <Button
                          aria-label={`Descargar ${evidence.fileName}`}
                          icon={Download}
                          loading={busyId === evidence.id}
                          onClick={() => void open(evidence, 'download')}
                          size="sm"
                          variant="secondary"
                        >
                          Descargar
                        </Button>
                        {evidence.canVoid && (
                          <Button
                            aria-label={`Anular ${evidence.fileName}`}
                            icon={Ban}
                            onClick={() => {
                              setVoiding(evidence)
                              setVoidReason('')
                              setVoidError('')
                            }}
                            size="sm"
                            variant="ghost"
                          >
                            Anular
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader icon={UploadCloud} title="Agregar evidencia" />
          {!can(incident, 'evidence') ? (
            <div className="p-5 sm:p-6">
              <Alert tone="info">
                No se pueden agregar evidencias a incidencias {incident.status === 'Cerrado' ? 'cerradas' : 'descartadas'}.
              </Alert>
            </div>
          ) : remaining === 0 ? (
            <div className="p-5 sm:p-6">
              <Alert tone="warning">
                Se alcanzó el máximo de {MAX_EVIDENCES} evidencias activas. Anula alguna para agregar otra.
              </Alert>
            </div>
          ) : (
            <UploadForm code={incident.code} onUploaded={() => reload(true)} remaining={remaining} />
          )}
        </Card>
      </div>

      <Modal onClose={() => setPreview(null)} open={preview !== null} size="lg" title={preview?.name ?? ''}>
        {preview && <img alt={preview.name} className="mx-auto max-h-[70vh] rounded-lg object-contain" src={preview.url} />}
      </Modal>

      <Modal
        description="La evidencia no se elimina: queda marcada como anulada en el historial (RN-009)."
        footer={
          <>
            <Button onClick={() => setVoiding(null)} variant="secondary">
              Cancelar
            </Button>
            <Button icon={Trash2} loading={voidSaving} onClick={() => void confirmVoid()} variant="danger">
              Anular evidencia
            </Button>
          </>
        }
        onClose={() => setVoiding(null)}
        open={voiding !== null}
        title={`Anular "${voiding?.fileName ?? ''}"`}
      >
        <Field error={voidError} id="void-reason" label="Motivo de la anulación" required>
          <Textarea
            data-autofocus
            maxLength={500}
            onChange={(e) => {
              setVoidReason(e.target.value)
              setVoidError('')
            }}
            value={voidReason}
          />
        </Field>
      </Modal>
    </div>
  )
}

export default IncidentEvidencePage
