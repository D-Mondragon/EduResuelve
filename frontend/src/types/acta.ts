import type { EvidenceType, FollowUpKind, IncidentCategory, IncidentPriority, IncidentStatus } from './incident'
import type { UserRole } from './user'

export type ActaKind = 'Provisional' | 'Definitiva'
export type ActaStatus = 'Vigente' | 'Reemplazada'

/** Persona tal como queda registrada en el acta (DNI parcialmente oculto). */
export interface ActaPerson {
  fullName?: string
  role: UserRole
  dni?: string
}

export interface ActaMeta {
  number: string
  seq: number
  kind: ActaKind
  status: ActaStatus
  issuedAt: string
  issuedBy: ActaPerson | null
  replacedAt: string | null
  replacedReason: string | null
  verificationCode: string
}

/** Copia fija de lo documentado. En la versión resumida (Estudiante) faltan los campos opcionales. */
export interface ActaContent {
  kind: ActaKind
  incident: {
    code: string
    title: string
    description: string
    category: IncidentCategory
    priority: IncidentPriority
    status: IncidentStatus
    incidentDate: string
    location: string
    registeredAt: string
    involvedPeople?: string
    observations?: string
  }
  reporter: ActaPerson | null
  responsible: ActaPerson | null
  followUps: {
    kind: FollowUpKind
    previousStatus: IncidentStatus | null
    newStatus: IncidentStatus | null
    createdAt: string
    user: ActaPerson | null
    observation?: string
    reason?: string | null
    responsible?: ActaPerson | null
  }[]
  evidences: {
    fileName: string
    evidenceType: EvidenceType
    status: 'Activa' | 'Anulada'
    uploadedAt: string
    mimeType?: string
    sizeBytes?: number
    description?: string
    voidReason?: string | null
    voidedAt?: string | null
    uploadedBy?: ActaPerson | null
  }[]
  resolution: {
    summary: string
    actionsTaken: string
    result: string
    resolutionDate: string
    registeredAt: string
    registeredBy: ActaPerson | null
    observations?: string
  } | null
  closure: {
    closedAt: string
    closedBy: ActaPerson | null
    observations?: string
  } | null
  metrics: {
    hoursToResolve: number | null
    hoursToClose: number | null
  }
}

export interface Acta extends ActaMeta {
  incidentCode: string
  contentHash: string
  version: 'Completa' | 'Resumida'
  content: ActaContent
}

export type ActaVerification =
  | { valid: false; message: string }
  | {
      valid: true
      number: string
      incidentCode: string
      kind: ActaKind
      status: ActaStatus
      issuedAt: string
      category: IncidentCategory
      resolutionDate: string | null
      closedAt: string | null
      replacedAt: string | null
      replacedReason: string | null
      currentNumber: string | null
      hashPrefix: string
    }
