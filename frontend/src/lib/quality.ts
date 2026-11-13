/**
 * Metas de calidad del sistema (Fases 5–8 del proyecto de calidad).
 * Cada indicador del panel se compara contra su meta y muestra "Cumple" / "No cumple".
 */
export const QUALITY_TARGETS = {
  /** % de incidencias resueltas dentro de la meta de su prioridad */
  resolutionWithinTargetPct: 80,
  /** % de encuestas con satisfacción 4 o 5 (CSAT) */
  csatPct: 80,
  /** % de operaciones respondidas en menos de 3 s (RNF-001) */
  underThresholdPct: 95,
  /** Puntaje de calidad de datos (promedio de controles de integridad, consistencia, unicidad y actualización) */
  dataQualityScore: 95,
} as const

export type TargetState = 'ok' | 'fail' | 'none'

export function targetState(value: number | null | undefined, target: number): TargetState {
  if (value === null || value === undefined || Number.isNaN(value)) return 'none'
  return value >= target ? 'ok' : 'fail'
}

/** Horas → texto corto: "18 h", "3,1 días". */
export function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return '—'
  if (hours < 48) return `${hours.toLocaleString('es-PE', { maximumFractionDigits: 1 })} h`
  return `${(hours / 24).toLocaleString('es-PE', { maximumFractionDigits: 1 })} días`
}

export function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toLocaleString('es-PE', { maximumFractionDigits: 2 })} s`
}

export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `${value.toLocaleString('es-PE', { maximumFractionDigits: 1 })} %`
}

const operationNames: Record<string, string> = {
  carga_pagina: 'Carga de la página',
  login: 'Iniciar sesión',
  logout: 'Cerrar sesión',
  me: 'Verificar sesión',
  change_password: 'Cambiar contraseña',
  list_incidents: 'Listar incidencias',
  get_incident: 'Ver incidencia',
  create_incident: 'Registrar incidencia',
  update_incident: 'Editar incidencia',
  transition_incident: 'Cambiar estado',
  reassign_incident: 'Reasignar',
  add_observation: 'Agregar observación',
  resolve_incident: 'Registrar resolución',
  close_incident: 'Cerrar incidencia',
  list_assignable_users: 'Listar responsables',
  evidence_begin: 'Subir evidencia (inicio)',
  evidence_chunk: 'Subir evidencia (parte)',
  evidence_finish: 'Subir evidencia (fin)',
  evidence_chunk_get: 'Descargar evidencia (parte)',
  evidence_void: 'Anular evidencia',
  list_users: 'Listar usuarios',
  create_user: 'Crear usuario',
  update_user: 'Editar usuario',
  set_user_status: 'Activar/desactivar usuario',
  reset_user_password: 'Restablecer contraseña',
  list_audit: 'Auditoría',
  list_notifications: 'Notificaciones',
  mark_notifications_read: 'Marcar notificaciones',
  get_acta: 'Ver acta',
  verify_acta: 'Verificar acta',
  submit_survey: 'Enviar encuesta',
  perf_stats: 'Panel: rendimiento',
  quality_stats: 'Panel: calidad',
}

export function operationName(fn: string): string {
  return operationNames[fn] ?? fn
}
