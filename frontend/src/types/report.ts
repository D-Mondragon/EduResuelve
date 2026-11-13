import type { ActaKind } from './acta'
import type { IncidentCategory, IncidentPriority, IncidentStatus } from './incident'
import type { UserRef } from './user'

/** Fila de report_incidents: una incidencia con sus tiempos, acta vigente y satisfacción. */
export interface ReportRow {
  code: string
  title: string
  category: IncidentCategory
  priority: IncidentPriority
  status: IncidentStatus
  location: string
  incidentDate: string
  registeredAt: string
  updatedAt: string
  reporter: UserRef | null
  responsible: UserRef | null
  pendingReassignment: boolean
  targetHours: number
  resolvedAt: string | null
  closedAt: string | null
  hoursToResolve: number | null
  hoursToClose: number | null
  ageHours: number
  acta: { number: string; kind: ActaKind } | null
  surveyRating: number | null
}
