import { ArrowLeft, ExternalLink, FileDown, ShieldCheck } from 'lucide-react'
import { lazy, Suspense, useCallback, type ReactNode } from 'react'
import { useParams } from 'react-router'
import { useAuth } from '../auth/authContext'
import { Logo } from '../components/Logo'
import { Button, ButtonLink } from '../components/ui/Button'
import { Alert, ErrorState, LoadingState } from '../components/ui/Feedback'
import { Field as FormField, Select } from '../components/ui/Field'
import { useAsync } from '../hooks/useAsync'
import { useQueryParams } from '../hooks/useQueryParams'
import { followUpEvent, formatDuration, institutionName, personLabel, verifyUrl } from '../lib/acta'
import {
  actaCopyLabels,
  familyCandidates,
  legalBasis,
  needsDirectorSignature,
  showParticipant,
  visibleMeasures,
  type ActaCopy,
} from '../lib/caseDocs'
import { safeReturnPath } from '../lib/reports'
import { api } from '../lib/api'
import { formatBytes, formatDate, formatDateTime } from '../lib/format'
import { cn } from '../lib/ui'
import type { Acta } from '../types/acta'
import { hasDiscipline, hasViolence } from '../types/case'

// El generador de QR solo se descarga al abrir un acta (no engrosa el resto de la app)
const QrCode = lazy(() => import('../components/QrCode').then((m) => ({ default: m.QrCode })))

/* El acta se dibuja siempre como una hoja blanca (también en modo oscuro), igual que al imprimirla. */

function Section({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="flex break-after-avoid items-center gap-2 border-b-2 border-emerald-700 pb-1 text-[0.95rem] font-bold uppercase tracking-wide text-emerald-800">
        <span className="flex size-6 items-center justify-center rounded-full bg-emerald-700 text-xs text-white">{number}</span>
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

/** wide: ocupa las dos columnas. prose: texto corrido (justificado); por defecto, los campos anchos. */
function Field({ label, children, wide = false, prose = wide }: { label: string; children: ReactNode; wide?: boolean; prose?: boolean }) {
  return (
    <div className={cn('min-w-0 break-inside-avoid', wide && 'sm:col-span-2')}>
      <dt className="text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={cn('mt-0.5 whitespace-pre-line break-words text-sm leading-6 text-slate-900', prose && 'acta-prose')}>{children || '—'}</dd>
    </div>
  )
}

function SignatureLine({ role, name }: { role: string; name?: string }) {
  return (
    <div className="min-w-0 pt-12 text-center">
      <div className="border-t border-slate-500 pt-1.5">
        <p className="break-words text-sm font-medium text-slate-900">{name || ' '}</p>
        <p className="text-xs text-slate-600">{role}</p>
      </div>
    </div>
  )
}

const tableHead = 'border-b border-slate-300 bg-slate-100 px-2 py-1.5 text-left text-[0.7rem] font-semibold uppercase tracking-wide text-slate-600'
const tableCell = 'border-b border-slate-200 px-2 py-1.5 align-top text-[0.8rem] leading-5 text-slate-800'

function ActaDocument({
  acta,
  viewer,
  copy,
  familyOf,
}: {
  acta: Acta
  viewer: string
  copy: ActaCopy
  familyOf: number | null
}) {
  const c = acta.content
  const kase = c.case
  // Datos internos (observaciones, detalle del historial): solo en la versión completa para el archivo
  const full = acta.version === 'Completa' && copy === 'completa'
  const replaced = acta.status === 'Reemplazada'
  const code = acta.verificationCode
  const link = verifyUrl(code)
  const discipline = hasDiscipline(kase?.regime)
  const violence = hasViolence(kase?.regime)
  const convivencia = discipline || violence
  const people = (kase?.participants ?? []).map((p) => showParticipant(p, copy, familyOf))
  const familyStudent = people.find((p) => p.own)
  const measures = kase ? visibleMeasures(kase, copy, familyOf) : []
  const nameOf = (id: number) => people.find((p) => p.id === id)?.name ?? '—'
  const statements = people.filter((p) => p.role !== 'Testigo' && p.statement)
  const witnesses = people.filter((p) => p.role === 'Testigo')
  const signDirector = needsDirectorSignature(kase)
  let n = 0
  const next = () => ++n

  return (
    <article
      aria-label={`Acta ${acta.number}`}
      // En pantalla, la hoja reproduce los márgenes A4 del impreso (2,5 cm; 3 cm a la izquierda)
      className="acta-sheet relative mx-auto max-w-[210mm] overflow-hidden rounded-lg border border-slate-300 bg-white px-6 py-8 text-slate-900 shadow-sm md:py-[25mm] md:pr-[25mm] md:pl-[30mm] print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none"
      lang="es"
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
        {acta.version !== 'Completa' && (
          <span className="rounded-full border border-slate-400 px-2.5 py-1 font-semibold text-slate-700">Versión para el interesado</span>
        )}
        {acta.version === 'Completa' && copy !== 'completa' && (
          <span className="rounded-full border border-slate-400 px-2.5 py-1 font-semibold text-slate-700">
            {copy === 'familia' ? `Copia para la familia${familyStudent ? ` de ${familyStudent.name}` : ''}` : 'Copia para terceros'}
          </span>
        )}
        {kase && kase.regime !== 'Ninguno' && (
          <span className="rounded-full border border-emerald-600 px-2.5 py-1 font-semibold text-emerald-800">Régimen: {kase.regime}</span>
        )}
        <span className="ml-auto font-semibold uppercase tracking-wide text-rose-700">Documento confidencial</span>
      </div>

      <p className="acta-prose mt-4 text-sm leading-6 text-slate-700">
        Se deja constancia de la atención brindada a la incidencia <strong>{c.incident.code}</strong>, con el detalle
        de lo registrado en el sistema, las personas que intervinieron y las medidas adoptadas para su resolución.
      </p>

      {kase && (
        <div className="mt-3 break-inside-avoid rounded-md bg-slate-50 p-3 text-xs leading-5 text-slate-700">
          <p className="font-semibold uppercase tracking-wide text-slate-600">Base normativa</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {legalBasis(kase).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <Section number={next()} title="Datos del hecho">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
          <Field label="Código">{c.incident.code}</Field>
          <Field label="Categoría">{c.incident.category}</Field>
          <Field label="Prioridad">{c.incident.priority}</Field>
          <Field label="Fecha del hecho">
            {formatDate(c.incident.incidentDate, 'long')}
            {kase?.incidentTime && `, ${kase.incidentTime} h`}
          </Field>
          <Field label="Lugar">{c.incident.location}</Field>
          <Field label="Reportada el">{formatDateTime(c.incident.registeredAt)}</Field>
        </dl>
        <dl className="mt-3 grid grid-cols-1 gap-y-3">
          <Field label="Título">{c.incident.title}</Field>
          <Field label="Descripción de los hechos" prose>{c.incident.description}</Field>
          {full && c.incident.observations && <Field label="Observaciones del registro" prose>{c.incident.observations}</Field>}
        </dl>
      </Section>

      {kase?.formalRegisteredAt && (
        <Section number={next()} title="Registro formal del incidente">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <Field label="Acciones inmediatas" wide>{kase.immediateActions}</Field>
            <Field label="Registró (personal de la institución)">
              {personLabel(kase.formalRegisteredBy)}
              {kase.formalRegisteredBy?.dni && <span className="block text-xs text-slate-500">DNI {kase.formalRegisteredBy.dni}</span>}
            </Field>
            <Field label="Fecha del registro formal">{formatDateTime(kase.formalRegisteredAt)}</Field>
          </dl>
          <p className="mt-2 text-xs text-slate-500">
            Registro objetivo y cronológico, sin calificativos, diagnósticos ni conclusiones sobre responsabilidad.
          </p>
        </Section>
      )}

      <Section number={next()} title="Personas que intervienen">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Field label="Reportó la incidencia">
            {personLabel(c.reporter)}
            {c.reporter?.dni && <span className="block text-xs text-slate-500">DNI {c.reporter.dni}</span>}
          </Field>
          <Field label="Responsable de la atención">
            {personLabel(c.responsible)}
            {c.responsible?.dni && <span className="block text-xs text-slate-500">DNI {c.responsible.dni}</span>}
          </Field>
          {full && !people.length && (
            <Field label="Personas involucradas (según lo registrado)" wide>
              {c.incident.involvedPeople || 'No se especificaron.'}
            </Field>
          )}
        </dl>
        {people.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse">
              <thead>
                <tr>
                  <th className={tableHead} scope="col">Rol</th>
                  <th className={tableHead} scope="col">{copy === 'completa' ? 'Nombres y apellidos' : 'Nombre o iniciales'}</th>
                  <th className={tableHead} scope="col">DNI</th>
                  <th className={tableHead} scope="col">Grado y sección</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr className="break-inside-avoid" key={p.id}>
                    <td className={tableCell}>{p.role}</td>
                    <td className={cn(tableCell, 'font-medium')}>{p.name}</td>
                    <td className={cn(tableCell, 'font-mono')}>{p.dni || '—'}</td>
                    <td className={tableCell}>{p.gradeSection || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {copy !== 'completa' && (
              <p className="mt-1 text-xs text-slate-500">
                {copy === 'familia'
                  ? 'Los datos de otros estudiantes se muestran solo con iniciales (D.S. 021-2026-MINEDU, 8.2).'
                  : 'Documento dirigido a terceros: solo iniciales y DNI (R.M. 383-2025-MINEDU, principio 3.8).'}
              </p>
            )}
          </div>
        )}
      </Section>

      {convivencia && statements.length > 0 && (
        <Section number={next()} title="Versión de los hechos">
          <div className="space-y-4">
            {statements.map((p) => (
              <div className="break-inside-avoid rounded-md border border-slate-200 p-3" key={p.id}>
                <p className="text-sm font-semibold text-slate-900">
                  {p.name} <span className="font-normal text-slate-600">· {p.role}</span>
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  {p.statement!.statementStatus === 'Registrada'
                    ? `Brindada por: ${p.statement!.statementBy ?? '—'} · ${formatDateTime(p.statement!.statementAt)}`
                    : p.statement!.statementStatus === 'Se abstuvo'
                      ? `Se abstuvo de declarar · ${formatDateTime(p.statement!.statementAt)}`
                      : 'Pendiente de consignar.'}
                </p>
                {p.statement!.statement && (
                  <p className="acta-prose mt-2 whitespace-pre-line text-sm leading-6 text-slate-800">“{p.statement!.statement}”</p>
                )}
                {p.statement!.statementStatus === 'Registrada' && (
                  <div className="ml-auto max-w-64">
                    <SignatureLine role="Firma de quien brindó la versión" />
                  </div>
                )}
              </div>
            ))}
            {witnesses.length > 0 && (
              <p className="text-xs text-slate-600">
                Testigos: {witnesses.map((w) => w.name).join(', ')}.
              </p>
            )}
          </div>
        </Section>
      )}

      {discipline && kase && (
        <Section number={next()} title="Calificación de la falta y medidas">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
            <Field label="Gravedad">{kase.severity ?? 'Sin calificar'}</Field>
            {(kase.severity === 'Grave' || kase.severity === 'Muy grave') && (
              <>
                <Field label="Comunicada a Dirección">
                  {formatDateTime(kase.directorNotifiedAt)}
                  {kase.directorLate && <span className="block text-xs font-semibold text-rose-700">Fuera del plazo de 24 horas</span>}
                </Field>
                <Field label="Dirección tomó conocimiento">
                  {kase.directorAckAt ? `${personLabel(kase.directorAckBy)} · ${formatDateTime(kase.directorAckAt)}` : 'Pendiente'}
                </Field>
              </>
            )}
          </dl>
          {measures.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No se adoptaron medidas.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {measures.map((m, index) => (
                <li className="break-inside-avoid rounded-md border border-slate-200 p-3 text-sm" key={index}>
                  <p className="font-semibold text-slate-900">
                    Medida {m.kind.toLowerCase()} · {nameOf(m.participantId)}
                  </p>
                  <p className="acta-prose mt-1 whitespace-pre-line leading-6 text-slate-800">{m.description}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Decidió: {personLabel(m.decidedBy)} · {formatDateTime(m.decidedAt)}
                  </p>
                  {m.isSeparation && (
                    <p className="mt-1 text-xs font-semibold text-slate-800">
                      La familia puede solicitar la reconsideración de esta medida dentro de los 3 días hábiles siguientes a su
                      notificación.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {kase && kase.meetings.length > 0 && (
        <Section number={next()} title="Reunión con la familia">
          <div className="space-y-3">
            {kase.meetings.map((m, index) => (
              <div className="break-inside-avoid rounded-md border border-slate-200 p-3" key={index}>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                  <Field label="Fecha">{formatDate(m.meetingDate, 'long')}</Field>
                  <Field label="Asistentes">{m.attendees}</Field>
                  <Field label="Acuerdos y compromisos" wide>{m.agreements}</Field>
                  {full && m.notes && <Field label="Notas" wide>{m.notes}</Field>}
                </dl>
                {m.signatureStatus === 'Se negó a firmar' && (
                  <p className="mt-2 text-xs font-semibold text-slate-800">
                    Se deja constancia de que el padre, madre o apoderado se negó a firmar el acta de la reunión.
                  </p>
                )}
                {m.signatureStatus === 'Pendiente de firma' && (
                  <p className="mt-2 text-xs text-slate-600">Acta de la reunión pendiente de firma.</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {kase && (violence || kase.referrals.length > 0) && (
        <Section number={next()} title={violence ? 'Protocolo de violencia escolar' : 'Derivaciones'}>
          {violence && (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label="Tipo de violencia">{kase.violenceType ?? 'Sin dato'}</Field>
              <Field label="Modalidad">{kase.violenceModality ?? 'Sin dato'}</Field>
              <Field label="Código SíseVe">{kase.siseveCode ?? 'Pendiente de registro'}</Field>
              <Field label="Folio del Libro de Registro de Incidencias">{kase.bookFolio ?? 'Pendiente'}</Field>
            </dl>
          )}
          {kase.referrals.length > 0 ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[28rem] border-collapse">
                <thead>
                  <tr>
                    <th className={tableHead} scope="col">Derivado a</th>
                    <th className={tableHead} scope="col">Oficio</th>
                    <th className={tableHead} scope="col">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {kase.referrals.map((r, index) => (
                    <tr className="break-inside-avoid" key={index}>
                      <td className={tableCell}>{r.entity}</td>
                      <td className={cn(tableCell, 'font-mono')}>{r.officeNumber}</td>
                      <td className={cn(tableCell, 'whitespace-nowrap')}>{formatDate(r.referralDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">No se registraron derivaciones.</p>
          )}
        </Section>
      )}

      <Section number={next()} title="Resolución">
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

      <Section number={next()} title="Cronología de la atención">
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

      <Section number={next()} title="Evidencias">
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

      <Section number={next()} title="Validación y cierre">
        {c.closure ? (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <Field label="Cerrada por">{personLabel(c.closure.closedBy)}</Field>
            <Field label="Fecha de cierre">{formatDateTime(c.closure.closedAt)}</Field>
            {full && <Field label="Observaciones de cierre" wide>{c.closure.observations || 'Sin observaciones.'}</Field>}
          </dl>
        ) : (
          <p className="acta-prose text-sm text-slate-700">
            Pendiente de validación por Orientación o Administración. Esta acta será reemplazada por el acta definitiva
            al cerrarse la incidencia.
          </p>
        )}
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 rounded-md bg-slate-50 p-3 sm:grid-cols-2">
          <Field label="Tiempo hasta la resolución">{formatDuration(c.metrics.hoursToResolve)}</Field>
          <Field label="Tiempo hasta el cierre">{c.closure ? formatDuration(c.metrics.hoursToClose) : 'En curso'}</Field>
        </dl>
      </Section>

      {/* Firmas: según el caso (registro formal, Dirección en faltas graves o violencia, familia si hubo reunión) */}
      <section aria-label="Firmas" className="mt-8 grid grid-cols-1 gap-x-6 gap-y-2 break-inside-avoid sm:grid-cols-3">
        {kase?.formalRegisteredAt && kase.formalRegisteredBy?.fullName !== c.responsible?.fullName && (
          <SignatureLine name={kase.formalRegisteredBy?.fullName} role="Personal que realizó el registro formal" />
        )}
        <SignatureLine
          name={c.responsible?.fullName}
          role={
            kase?.formalRegisteredAt && kase.formalRegisteredBy?.fullName === c.responsible?.fullName
              ? 'Registro formal y responsable de la atención'
              : 'Responsable de la atención'
          }
        />
        <SignatureLine name={c.closure?.closedBy?.fullName} role="Validó y cerró (Orientación / Administración)" />
        {signDirector && <SignatureLine name={kase?.directorAckBy?.fullName} role="Dirección" />}
        {kase && (kase.meetings.length > 0 || copy === 'familia') && (
          <SignatureLine name={copy === 'familia' && familyStudent ? `Familia de ${familyStudent.name}` : undefined} role="Padre, madre o apoderado" />
        )}
        {!kase && <SignatureLine name={c.reporter?.fullName} role="Conformidad de quien registró (opcional)" />}
      </section>

      {/* Pie de verificación */}
      <footer className="mt-8 flex break-inside-avoid flex-col-reverse gap-3 rounded-md border border-slate-300 p-3 text-xs leading-5 text-slate-600 sm:flex-row sm:items-start print:flex-row print:items-start">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-1.5 font-semibold text-slate-800">
            <ShieldCheck aria-hidden="true" className="size-4 text-emerald-700" />
            Código de verificación: <span className="font-mono text-sm tracking-wider text-slate-900">{code}</span>
          </p>
          <p className="mt-1">
            Comprueba la autenticidad de este documento escaneando el código QR o en{' '}
            <a
              className="break-all font-medium text-emerald-800 underline underline-offset-2 hover:text-emerald-900 print:text-slate-700 print:no-underline"
              href={link}
              rel="noopener"
              target="_blank"
            >
              {link}
              <span className="sr-only"> (abre en una pestaña nueva)</span>
            </a>
            . Huella SHA-256 del contenido: <span className="font-mono">{acta.contentHash.slice(0, 16)}…</span>
          </p>
          {replaced && (
            <p className="mt-1 font-semibold text-rose-700">
              Esta acta fue reemplazada el {formatDateTime(acta.replacedAt)}. {acta.replacedReason}
            </p>
          )}
          {convivencia && (
            <p className="mt-1 font-medium text-slate-700">
              Este registro no exime de activar los protocolos de atención de la violencia escolar.
            </p>
          )}
          <p className="mt-1">
            Generado por EduResuelve el {formatDateTime(new Date().toISOString())} a solicitud de {viewer}.
            {acta.version !== 'Completa' && ' Versión resumida: omite observaciones internas y datos de terceros.'}
            {copy === 'familia' && ' Copia para la familia: omite observaciones internas y los datos de otros estudiantes.'}
            {copy === 'terceros' && ' Copia para terceros: estudiantes identificados solo con iniciales y DNI.'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:gap-1 print:flex-col print:gap-1">
          <Suspense fallback={<div aria-hidden="true" className="size-24 sm:size-28 print:size-[30mm]" />}>
            <QrCode className="size-24 sm:size-28 print:size-[30mm]" label={`Código QR para verificar el acta ${code}`} value={link} />
          </Suspense>
          <a
            className="inline-flex items-center gap-1 font-medium text-emerald-800 hover:underline print:hidden"
            href={link}
            rel="noopener"
            target="_blank"
          >
            <ExternalLink aria-hidden="true" className="size-3.5" />
            Verificar acta
          </a>
          <span className="hidden text-[10px] text-slate-500 print:block">Escanea para verificar</span>
        </div>
      </footer>
    </article>
  )
}

const copies: ActaCopy[] = ['completa', 'familia', 'terceros']

function ActaPage() {
  const { code = '', number = '' } = useParams()
  const { user } = useAuth()
  const load = useCallback(() => api.getActa(number), [number])
  const { data: acta, error, loading, reload } = useAsync(load)
  const [search, updateSearch] = useQueryParams()
  const fromReports = safeReturnPath(search.get('volver'))
  const incidentPath = `/incidencias/${encodeURIComponent(code)}`
  const back = fromReports ?? incidentPath

  if (loading && !acta) return <LoadingState label="Preparando el acta…" />
  if (error || !acta) return <ErrorState error={error ?? new Error('Acta no encontrada.')} onRetry={() => reload()} />

  // Copias derivadas (solo personal, actas con caso de convivencia): misma acta y mismo código de verificación
  const candidates = familyCandidates(acta.content.case)
  const canCopy = acta.version === 'Completa' && Boolean(acta.content.case) && acta.content.case!.participants.length > 0
  const requestedCopy = search.get('copia') as ActaCopy | null
  const copy: ActaCopy = canCopy && requestedCopy && copies.includes(requestedCopy) ? requestedCopy : 'completa'
  const requestedFamily = Number(search.get('estudiante'))
  const familyOf =
    copy === 'familia' ? (candidates.find((p) => p.id === requestedFamily) ?? candidates[0])?.id ?? null : null

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex flex-wrap items-center gap-1">
          <ButtonLink icon={ArrowLeft} to={back} variant="ghost">
            {fromReports ? 'Volver a Reportes' : `Volver a ${acta.incidentCode}`}
          </ButtonLink>
          {fromReports && (
            <ButtonLink to={incidentPath} variant="ghost">
              Ver incidencia {acta.incidentCode}
            </ButtonLink>
          )}
        </div>
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

        {canCopy && (
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-end">
            <FormField className="sm:w-72" id="acta-copy" label="Versión del documento">
              <Select
                onChange={(e) =>
                  updateSearch((next) => {
                    if (e.target.value === 'completa') next.delete('copia')
                    else next.set('copia', e.target.value)
                    if (e.target.value !== 'familia') next.delete('estudiante')
                  })
                }
                value={copy}
              >
                {copies.map((option) => (
                  <option key={option} value={option}>
                    {actaCopyLabels[option]}
                  </option>
                ))}
              </Select>
            </FormField>
            {copy === 'familia' && candidates.length > 0 && (
              <FormField className="sm:w-72" id="acta-family" label="Familia del estudiante">
                <Select onChange={(e) => updateSearch((next) => next.set('estudiante', e.target.value))} value={String(familyOf ?? '')}>
                  {candidates.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.role.toLowerCase()})
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            {copy !== 'completa' && (
              <p className="text-xs leading-5 text-muted sm:flex-1">
                La descripción se imprime tal como se registró: revisa que no mencione por su nombre a otros estudiantes.
              </p>
            )}
          </div>
        )}

        <p className="text-sm text-muted">
          Para guardarla, pulsa <strong>Descargar PDF</strong> y elige <strong>“Guardar como PDF”</strong> en el destino de impresión.
        </p>
      </div>

      <ActaDocument acta={acta} copy={copy} familyOf={familyOf} viewer={user?.fullName ?? '—'} />
    </div>
  )
}

export default ActaPage
