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
