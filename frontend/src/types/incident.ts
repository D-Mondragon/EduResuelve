export type IncidentStatus =
  | 'Nuevo'
  | 'En revisión'
  | 'Asignado'
  | 'En atención'
  | 'Resuelto'
  | 'Cerrado'
  | 'Descartado'

export type IncidentPriority = 'Baja' | 'Media' | 'Alta' | 'Crítica'

export type IncidentCategory =
  | 'Convivencia'
  | 'Académica'
  | 'Infraestructura'
  | 'Orientación'
  | 'Administrativa'

export type EvidenceType =
  | 'Documento'
  | 'Imagen'
  | 'Captura de pantalla'
  | 'Informe'
  | 'Otro'

export interface Resolution {
  summary: string
  actionsTaken: string
  result: string
  observations: string
  resolutionDate: string
  registeredBy: string
}

export interface Closure {
  closureObservations: string
  closedAt: string
  closedBy: string
}

export interface Incident {
  id: string
  code: string
  title: string
  description: string
  category: IncidentCategory
  priority: IncidentPriority
  status: IncidentStatus
  incidentDate: string
  location: string
  involvedPeople: string
  registeredAt: string
  updatedAt: string
  responsible: string
  responsibleUserId?: string
  observations: string
  resolution?: Resolution
  closure?: Closure
}

export interface FollowUp {
  id: number
  incidentId: string
  status: IncidentStatus
  previousStatus?: IncidentStatus
  newStatus?: IncidentStatus
  responsibleUserId?: string
  reason?: string
  date: string
  time: string
  user: string
  observation: string
}

export interface Evidence {
  id: number
  incidentId: string
  fileName: string
  fileType: string
  fileSize: number
  evidenceType: EvidenceType
  description: string
  registeredAt: string
  registeredBy: string
}