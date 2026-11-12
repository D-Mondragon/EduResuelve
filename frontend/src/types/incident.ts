import type { ActaMeta } from './acta'
import type { UserRef } from './user'

export const incidentStatuses = [
  'Nuevo',
  'En revisión',
  'Asignado',
  'En atención',
  'Resuelto',
  'Cerrado',
  'Descartado',
] as const
export type IncidentStatus = (typeof incidentStatuses)[number]

export const incidentPriorities = ['Baja', 'Media', 'Alta', 'Crítica'] as const
export type IncidentPriority = (typeof incidentPriorities)[number]

export const incidentCategories = [
  'Convivencia',
  'Académica',
  'Infraestructura',
  'Orientación',
  'Administrativa',
] as const
export type IncidentCategory = (typeof incidentCategories)[number]

export const evidenceTypes = ['Documento', 'Imagen', 'Captura de pantalla', 'Informe', 'Otro'] as const
export type EvidenceType = (typeof evidenceTypes)[number]

/** Acciones que el backend autoriza para el usuario actual (RN-010). */
export type IncidentAction =
  | 'edit'
  | 'review'
  | 'assign'
  | 'discard'
  | 'start'
  | 'resolve'
  | 'reassign'
  | 'close'
  | 'reopen'
  | 'observe'
  | 'evidence'

export type TransitionAction = 'review' | 'assign' | 'start' | 'discard' | 'reopen'

export interface IncidentSummary {
  code: string
  title: string
  category: IncidentCategory
  priority: IncidentPriority
  status: IncidentStatus
  incidentDate: string
  location: string
  registeredAt: string
  updatedAt: string
  pendingReassignment: boolean
  reporter: UserRef | null
  responsible: UserRef | null
  allowedActions: IncidentAction[]
}

export type FollowUpKind =
  | 'Registro'
  | 'Cambio de estado'
  | 'Asignación'
  | 'Reasignación'
  | 'Edición'
  | 'Observación'
  | 'Evidencia'

export interface FollowUp {
  id: number
  kind: FollowUpKind
  previousStatus: IncidentStatus | null
  newStatus: IncidentStatus | null
  observation: string
  reason: string | null
  responsible: UserRef | null
  user: UserRef | null
  createdAt: string
}

export interface Evidence {
  id: number
  fileName: string
  mimeType: string
  sizeBytes: number
  originalSizeBytes: number
  compressed: boolean
  evidenceType: EvidenceType
  description: string
  status: 'Activa' | 'Anulada'
  voidReason: string | null
  voidedAt: string | null
  voidedBy: UserRef | null
  uploadedBy: UserRef | null
  uploadedAt: string
  chunkCount: number
  canVoid: boolean
}

export interface Resolution {
  summary: string
  actionsTaken: string
  result: string
  observations: string
  resolutionDate: string
  registeredBy: UserRef | null
  registeredAt: string
}

export interface Closure {
  observations: string
  closedBy: UserRef | null
  closedAt: string
}

export interface IncidentDetail extends IncidentSummary {
  description: string
  involvedPeople: string
  observations: string
  followUps: FollowUp[]
  evidences: Evidence[]
  resolution: Resolution | null
  closure: Closure | null
  /** Actas de resolución emitidas, de la más reciente a la más antigua (RN-011). */
  actas: ActaMeta[]
}

export interface IncidentFormData {
  title: string
  description: string
  category: IncidentCategory | ''
  priority: IncidentPriority | ''
  incidentDate: string
  location: string
  involvedPeople: string
}

export interface ResolutionFormData {
  summary: string
  actionsTaken: string
  result: string
  observations: string
  resolutionDate: string
}
