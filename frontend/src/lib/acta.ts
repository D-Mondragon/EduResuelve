import type { ActaContent, ActaPerson } from '../types/acta'

/** Nombre de la institución que aparece en el encabezado del acta (configurable por variable de entorno). */
export function institutionName(): string {
  const value = (import.meta.env.VITE_INSTITUTION_NAME as string | undefined)?.trim()
  return value || 'Institución Educativa'
}

/** Enlace público para verificar un acta impresa. */
export function verifyUrl(code: string, origin = window.location.origin): string {
  return `${origin}/verificar?codigo=${encodeURIComponent(code)}`
}

/** Duración legible a partir de horas: "18 h", "2 días y 4 h". */
export function formatDuration(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || !Number.isFinite(hours) || hours < 0) return '—'
  const total = Math.round(hours)
  if (total < 1) return 'menos de 1 h'
  const days = Math.floor(total / 24)
  const rest = total % 24
  if (days === 0) return `${rest} h`
  const dayText = `${days} ${days === 1 ? 'día' : 'días'}`
  return rest ? `${dayText} y ${rest} h` : dayText
}

export function personLabel(person: ActaPerson | null | undefined): string {
  if (!person) return '—'
  return person.fullName ? `${person.fullName} (${person.role})` : person.role
}

/** Descripción corta de un movimiento del historial para la cronología del acta. */
export function followUpEvent(entry: ActaContent['followUps'][number]): string {
  if (entry.kind === 'Registro') return 'Registro de la incidencia'
  if (entry.kind === 'Observación') return 'Observación'
  if (entry.kind === 'Evidencia') return 'Evidencia'
  if (entry.kind === 'Edición') return 'Edición de datos'
  if (entry.kind === 'Reasignación') return 'Reasignación'
  if (entry.kind === 'Registro formal') return 'Registro formal'
  if (entry.kind === 'Convivencia') return 'Convivencia'
  if (entry.previousStatus && entry.newStatus && entry.previousStatus !== entry.newStatus) {
    return `${entry.previousStatus} → ${entry.newStatus}`
  }
  return entry.kind
}

export interface ActaMilestone {
  at: string
  label: string
  by: ActaPerson | null
  detail?: string
}

/**
 * Hitos de la atención para el acta: solo los cambios de etapa y los plazos que se controlan
 * (registro, registro formal, revisión, asignación, atención, comunicación a Dirección,
 * resolución y cierre). El historial completo queda en el sistema (RN-003).
 */
export function actaMilestones(content: ActaContent): ActaMilestone[] {
  const out: ActaMilestone[] = []
  let formalSeen = false
  for (const f of content.followUps) {
    if (f.kind === 'Registro') {
      out.push({ at: f.createdAt, label: 'Reporte del hecho', by: f.user })
    } else if (f.kind === 'Registro formal') {
      if (!formalSeen) out.push({ at: f.createdAt, label: 'Registro formal', by: f.user })
      formalSeen = true
    } else if (f.kind === 'Asignación' || f.kind === 'Reasignación') {
      out.push({
        at: f.createdAt,
        label: f.kind === 'Asignación' ? 'Asignación' : 'Reasignación',
        by: f.user,
        detail: f.responsible ? `Responsable: ${personLabel(f.responsible)}` : undefined,
      })
    } else if (f.kind === 'Cambio de estado' && f.previousStatus !== f.newStatus) {
      const label =
        f.newStatus === 'En revisión'
          ? f.previousStatus === 'Cerrado' ? 'Reapertura' : 'Inicio de la revisión'
          : f.newStatus === 'En atención'
            ? 'Inicio de la atención'
            : f.newStatus === 'Resuelto'
              ? 'Resolución'
              : f.newStatus === 'Cerrado'
                ? 'Validación y cierre'
                : f.newStatus === 'Descartado'
                  ? 'Descarte'
                  : `${f.previousStatus ?? ''} → ${f.newStatus ?? ''}`
      out.push({ at: f.createdAt, label, by: f.user })
    }
  }
  const c = content.case
  if (c?.directorNotifiedAt) {
    out.push({
      at: c.directorNotifiedAt,
      label: 'Comunicación a Dirección',
      by: null,
      detail: c.directorLate ? 'Fuera del plazo de 24 horas' : 'Dentro del plazo de 24 horas',
    })
  }
  if (c?.directorAckAt) out.push({ at: c.directorAckAt, label: 'Dirección tomó conocimiento', by: c.directorAckBy })
  return out.sort((a, b) => a.at.localeCompare(b.at))
}
