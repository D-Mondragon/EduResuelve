import { ArrowLeft, FileDown, ShieldCheck } from 'lucide-react'
import { useCallback, type ReactNode } from 'react'
import { useParams } from 'react-router'
import { useAuth } from '../auth/authContext'
import { Logo } from '../components/Logo'
import { Button, ButtonLink } from '../components/ui/Button'
import { Alert, ErrorState, LoadingState } from '../components/ui/Feedback'
import { useAsync } from '../hooks/useAsync'
import { followUpEvent, formatDuration, institutionName, personLabel, verifyUrl } from '../lib/acta'
import { api } from '../lib/api'
import { formatBytes, formatDate, formatDateTime } from '../lib/format'
import { cn } from '../lib/ui'
import type { Acta } from '../types/acta'

/* El acta se dibuja siempre como una hoja blanca (también en modo oscuro), igual que al imprimirla. */

function Section({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <section className="mt-7 break-inside-avoid-page">
      <h2 className="flex items-center gap-2 border-b-2 border-emerald-700 pb-1 text-[0.95rem] font-bold uppercase tracking-wide text-emerald-800">
        <span className="flex size-6 items-center justify-center rounded-full bg-emerald-700 text-xs text-white">{number}</span>
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={cn('min-w-0', wide && 'sm:col-span-2')}>
      <dt className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line break-words text-sm leading-6 text-slate-900">{children || '—'}</dd>
    </div>
  )
}

function SignatureLine({ role, name }: { role: string; name?: string }) {
  return (
    <div className="min-w-0 pt-12 text-center">
      <div className="border-t border-slate-500 pt-1.5">
        <p className="truncate text-sm font-medium text-slate-900">{name || ' '}</p>
        <p className="text-xs text-slate-600">{role}</p>
      </div>
    </div>
  )
}

const tableHead = 'border-b border-slate-300 bg-slate-100 px-2 py-1.5 text-left text-[0.7rem] font-semibold uppercase tracking-wide text-slate-600'
const tableCell = 'border-b border-slate-200 px-2 py-1.5 align-top text-[0.8rem] leading-5 text-slate-800'

function ActaDocument({ acta, viewer }: { acta: Acta; viewer: string }) {
  const c = acta.content
  const full = acta.version === 'Completa'
  const replaced = acta.status === 'Reemplazada'
  const code = acta.verificationCode

  return (
    <article
      aria-label={`Acta ${acta.number}`}
      className="acta-sheet relative mx-auto max-w-[210mm] overflow-hidden rounded-lg border border-slate-300 bg-white px-6 py-8 text-slate-900 shadow-sm sm:px-12 sm:py-10 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none"
    >
      {replaced && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-[5rem] font-black tracking-widest text-rose-600/10 sm:text-[7rem]"
          style={{ transform: 'rotate(-30deg)' }}
        >
          REEMPLAZADA
        </div>
      )}

      {/* Encabezado */}
      <header className="flex flex-col gap-4 border-b border-slate-300 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Logo showText={false} />
          <div>
            <p className="text-base font-bold leading-tight text-slate-900">{institutionName()}</p>
            <p className="text-xs text-slate-600">Sistema de gestión de incidencias EduResuelve</p>
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-lg font-black tracking-wide text-emerald-800">ACTA DE RESOLUCIÓN</p>
          <p className="font-mono text-sm font-semibold">{acta.number}</p>
          <p className="text-xs text-slate-600">Emitida el {formatDateTime(acta.issuedAt)}</p>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span
          className={cn(
            'rounded-full px-2.5 py-1 font-bold uppercase tracking-wide',
            acta.kind === 'Definitiva' ? 'bg-emerald-700 text-white' : 'border border-amber-500 bg-amber-50 text-amber-800',
          )}
        >
          {acta.kind === 'Definitiva' ? 'Acta definitiva' : 'Acta provisional · pendiente de validación'}
        </span>
        {replaced && <span className="rounded-full bg-rose-600 px-2.5 py-1 font-bold uppercase text-white">Reemplazada</span>}
        {!full && <span className="rounded-full border border-slate-400 px-2.5 py-1 font-semibold text-slate-700">Versión para el interesado</span>}
        <span className="ml-auto font-semibold uppercase tracking-wide text-rose-700">Documento confidencial</span>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-700">
        Se deja constancia de la atención brindada a la incidencia <strong>{c.incident.code}</strong>, con el detalle
        de lo registrado en el sistema, las personas que intervinieron y las medidas adoptadas para su resolución.
      </p>

      <Section number={1} title="Datos de la incidencia">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
          <Field label="Código">{c.incident.code}</Field>
          <Field label="Categoría">{c.incident.category}</Field>
          <Field label="Prioridad">{c.incident.priority}</Field>
          <Field label="Fecha del hecho">{formatDate(c.incident.incidentDate, 'long')}</Field>
          <Field label="Lugar">{c.incident.location}</Field>
          <Field label="Registrada el">{formatDateTime(c.incident.registeredAt)}</Field>
        </dl>
        <dl className="mt-3 grid grid-cols-1 gap-y-3">
          <Field label="Título">{c.incident.title}</Field>
          <Field label="Descripción">{c.incident.description}</Field>
          {full && c.incident.observations && <Field label="Observaciones del registro">{c.incident.observations}</Field>}
        </dl>
      </Section>

      <Section number={2} title="Personas que intervienen">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Field label="Registró la incidencia">
            {personLabel(c.reporter)}
            {c.reporter?.dni && <span className="block text-xs text-slate-500">DNI {c.reporter.dni}</span>}
          </Field>
          <Field label="Responsable de la atención">
            {personLabel(c.responsible)}
            {c.responsible?.dni && <span className="block text-xs text-slate-500">DNI {c.responsible.dni}</span>}
          </Field>
          {full && (
            <Field label="Personas involucradas (según lo registrado)" wide>
              {c.incident.involvedPeople || 'No se especificaron.'}
            </Field>
          )}
        </dl>
      </Section>

      <Section number={3} title="Medidas adoptadas y resolución">
        {c.resolution ? (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <Field label="Resumen" wide>{c.resolution.summary}</Field>
            <Field label="Acciones realizadas" wide>{c.resolution.actionsTaken}</Field>
            <Field label="Resultado obtenido" wide>{c.resolution.result}</Field>
            {full && c.resolution.observations && <Field label="Observaciones" wide>{c.resolution.observations}</Field>}
            <Field label="Fecha de resolución">{formatDate(c.resolution.resolutionDate, 'long')}</Field>
            <Field label="Registrada por">{personLabel(c.resolution.registeredBy)}</Field>
          </dl>
        ) : (
          <p className="text-sm text-slate-600">Sin resolución registrada.</p>
        )}
      </Section>

      <Section number={4} title="Cronología de la atención">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse">
            <thead>
              <tr>
                <th className={tableHead} scope="col">Fecha y hora</th>
                <th className={tableHead} scope="col">Movimiento</th>
                <th className={tableHead} scope="col">Detalle</th>
                <th className={tableHead} scope="col">Realizado por</th>
              </tr>
            </thead>
            <tbody>
              {c.followUps.map((entry, index) => (
                <tr className="break-inside-avoid" key={`${entry.createdAt}-${index}`}>
                  <td className={cn(tableCell, 'whitespace-nowrap')}>{formatDateTime(entry.createdAt)}</td>
                  <td className={cn(tableCell, 'font-medium')}>{followUpEvent(entry)}</td>
                  <td className={tableCell}>
                    {full ? (
                      <>
                        {entry.responsible && <span className="block">Responsable: {personLabel(entry.responsible)}</span>}
                        {entry.reason && <span className="block">Motivo: {entry.reason}</span>}
                        {entry.observation}
                      </>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className={tableCell}>{personLabel(entry.user)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section number={5} title="Evidencias">
        {c.evidences.length === 0 ? (
          <p className="text-sm text-slate-600">No se adjuntaron evidencias.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse">
              <thead>
                <tr>
                  <th className={tableHead} scope="col">Archivo</th>
                  <th className={tableHead} scope="col">Tipo</th>
                  <th className={tableHead} scope="col">Fecha</th>
                  {full && <th className={tableHead} scope="col">Subido por</th>}
                  <th className={tableHead} scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {c.evidences.map((evidence, index) => (
                  <tr className="break-inside-avoid" key={`${evidence.fileName}-${index}`}>
                    <td className={cn(tableCell, evidence.status === 'Anulada' && 'line-through decoration-rose-500')}>
                      <span className="break-all">{evidence.fileName}</span>
                      {full && evidence.description && (
                        <span className="block text-xs text-slate-500 no-underline">{evidence.description}</span>
                      )}
                      {full && evidence.sizeBytes ? (
                        <span className="block text-xs text-slate-500">{formatBytes(evidence.sizeBytes)}</span>
                      ) : null}
                    </td>
                    <td className={tableCell}>{evidence.evidenceType}</td>
                    <td className={cn(tableCell, 'whitespace-nowrap')}>{formatDateTime(evidence.uploadedAt)}</td>
                    {full && <td className={tableCell}>{personLabel(evidence.uploadedBy)}</td>}
                    <td className={tableCell}>
                      {evidence.status}
                      {full && evidence.voidReason && <span className="block text-xs text-slate-500">Motivo: {evidence.voidReason}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section number={6} title="Validación y cierre">
        {c.closure ? (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <Field label="Cerrada por">{personLabel(c.closure.closedBy)}</Field>
            <Field label="Fecha de cierre">{formatDateTime(c.closure.closedAt)}</Field>
            {full && <Field label="Observaciones de cierre" wide>{c.closure.observations || 'Sin observaciones.'}</Field>}
          </dl>
        ) : (
          <p className="text-sm text-slate-700">
            Pendiente de validación por Orientación o Administración. Esta acta será reemplazada por el acta definitiva
            al cerrarse la incidencia.
          </p>
        )}
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 rounded-md bg-slate-50 p-3 sm:grid-cols-2">
          <Field label="Tiempo hasta la resolución">{formatDuration(c.metrics.hoursToResolve)}</Field>
          <Field label="Tiempo hasta el cierre">{c.closure ? formatDuration(c.metrics.hoursToClose) : 'En curso'}</Field>
        </dl>
      </Section>

      {/* Firmas */}
      <section aria-label="Firmas" className="mt-8 grid grid-cols-1 gap-6 break-inside-avoid sm:grid-cols-3">
        <SignatureLine name={c.responsible?.fullName} role="Responsable de la atención" />
        <SignatureLine name={c.closure?.closedBy?.fullName} role="Validó y cerró (Orientación / Administración)" />
        <SignatureLine name={c.reporter?.fullName} role="Conformidad de quien registró (opcional)" />
      </section>

      {/* Pie de verificación */}
      <footer className="mt-8 break-inside-avoid rounded-md border border-slate-300 p-3 text-xs leading-5 text-slate-600">
        <p className="flex items-center gap-1.5 font-semibold text-slate-800">
          <ShieldCheck aria-hidden="true" className="size-4 text-emerald-700" />
          Código de verificación: <span className="font-mono text-sm tracking-wider text-slate-900">{code}</span>
        </p>
        <p className="mt-1">
          Comprueba la autenticidad de este documento en <span className="break-all font-medium">{verifyUrl(code)}</span>.
          Huella SHA-256 del contenido: <span className="font-mono">{acta.contentHash.slice(0, 16)}…</span>
        </p>
        {replaced && (
          <p className="mt-1 font-semibold text-rose-700">
            Esta acta fue reemplazada el {formatDateTime(acta.replacedAt)}. {acta.replacedReason}
          </p>
        )}
        <p className="mt-1">
          Generado por EduResuelve el {formatDateTime(new Date().toISOString())} a solicitud de {viewer}.
          {!full && ' Versión resumida: omite observaciones internas y datos de terceros.'}
        </p>
      </footer>
    </article>
  )
}

function ActaPage() {
  const { code = '', number = '' } = useParams()
  const { user } = useAuth()
  const load = useCallback(() => api.getActa(number), [number])
  const { data: acta, error, loading, reload } = useAsync(load)
  const back = `/incidencias/${encodeURIComponent(code)}`

  if (loading && !acta) return <LoadingState label="Preparando el acta…" />
  if (error || !acta) return <ErrorState error={error ?? new Error('Acta no encontrada.')} onRetry={() => reload()} />

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <ButtonLink icon={ArrowLeft} to={back} variant="ghost">
          Volver a {acta.incidentCode}
        </ButtonLink>
        <Button icon={FileDown} onClick={() => window.print()} title="Abre el diálogo de impresión: elige “Guardar como PDF”">
          Descargar PDF
        </Button>
      </div>

      <div className="space-y-3 print:hidden">
        {acta.status === 'Reemplazada' && (
          <Alert title="Esta acta ya no está vigente" tone="warning">
            {acta.replacedReason} Consulta la versión más reciente desde la incidencia.
          </Alert>
        )}
        {acta.kind === 'Provisional' && acta.status === 'Vigente' && (
          <Alert tone="info">
            Acta provisional: se reemplazará por el acta definitiva cuando Orientación o Administración cierre la incidencia.
          </Alert>
        )}
        <p className="text-sm text-muted">
          Para guardarla, pulsa <strong>Descargar PDF</strong> y elige <strong>“Guardar como PDF”</strong> en el destino de impresión.
        </p>
      </div>

      <ActaDocument acta={acta} viewer={user?.fullName ?? '—'} />
    </div>
  )
}

export default ActaPage
