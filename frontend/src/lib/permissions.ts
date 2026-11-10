import type { IncidentAction, IncidentSummary } from '../types/incident'
import { managerRoles, type UserRole } from '../types/user'

export function isManager(role: UserRole | undefined): boolean {
  return role !== undefined && managerRoles.includes(role)
}

export function canManageUsers(role: UserRole | undefined): boolean {
  return role === 'Administrador'
}

export function canViewAudit(role: UserRole | undefined): boolean {
  return role === 'Administrador'
}

export function can(incident: Pick<IncidentSummary, 'allowedActions'>, action: IncidentAction): boolean {
  return incident.allowedActions.includes(action)
}

/** Acciones de cambio de estado que se gestionan en la pantalla de seguimiento. */
export const followUpActions: IncidentAction[] = ['review', 'assign', 'start', 'discard', 'reopen', 'reassign']

export interface NextStep {
  label: string
  description: string
  to: string
}

/** Sugiere el siguiente paso principal según las acciones permitidas (UX guiada). */
export function nextStep(incident: IncidentSummary): NextStep | null {
  const base = `/incidencias/${encodeURIComponent(incident.code)}`
  if (can(incident, 'reassign')) {
    return {
      label: 'Reasignar responsable',
      description: 'El responsable fue desactivado. Asigna a otra persona para continuar.',
      to: `${base}/seguimiento?accion=reassign`,
    }
  }
  if (can(incident, 'review')) {
    return { label: 'Iniciar revisión', description: 'La incidencia es nueva y espera revisión.', to: `${base}/seguimiento?accion=review` }
  }
  if (can(incident, 'assign')) {
    return { label: 'Asignar responsable', description: 'Revisada: asigna a quien la atenderá o descártala.', to: `${base}/seguimiento?accion=assign` }
  }
  if (can(incident, 'start')) {
    return { label: 'Iniciar atención', description: 'Tienes esta incidencia asignada. Indica que empezaste a atenderla.', to: `${base}/seguimiento?accion=start` }
  }
  if (can(incident, 'resolve')) {
    return { label: 'Registrar resolución', description: 'Documenta las acciones realizadas y el resultado.', to: `${base}/resolucion` }
  }
  if (can(incident, 'close')) {
    return { label: 'Cerrar incidencia', description: 'La resolución está registrada. Verifícala y cierra el caso.', to: `${base}/cierre` }
  }
  if (can(incident, 'reopen')) {
    return { label: 'Reabrir incidencia', description: 'Solo si existe un motivo justificado.', to: `${base}/seguimiento?accion=reopen` }
  }
  return null
}
