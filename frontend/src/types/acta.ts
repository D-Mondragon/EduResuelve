import type { EvidenceType, FollowUpKind, IncidentCategory, IncidentPriority, IncidentStatus } from './incident'
import type {
  MeasureKind,
  ParticipantRole,
  ReferralEntity,
  Regime,
  Severity,
  SignatureStatus,
  StatementSource,
  StatementStatus,
  ViolenceModality,
  ViolenceType,
} from './case'
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

export interface ActaCaseParticipant {
  id: number
  role: ParticipantRole
  fullName: string
  dni: string | null
  gradeSection: string
  statement: string
  statementStatus: StatementStatus
  statementBy: StatementSource | null
  statementAt: string | null
}

/** Registro formal y caso de convivencia (actas emitidas desde noviembre de 2026). */
export interface ActaCase {
  regime: Regime
  incidentTime: string | null
  immediateActions: string
  formalRegisteredBy: ActaPerson | null
  formalRegisteredAt: string | null
  severity: Severity | null
  directorNotifiedAt: string | null
  directorLate: boolean | null
  directorAckBy: ActaPerson | null
  directorAckAt: string | null
  violenceType: ViolenceType | null
  violenceModality: ViolenceModality | null
  siseveCode: string | null
  bookFolio: string | null
  participants: ActaCaseParticipant[]
  measures: {
    participantId: number
    kind: MeasureKind
    description: string
    isSeparation: boolean
    decidedBy: ActaPerson | null
    decidedAt: string
  }[]
  meetings: {
    meetingDate: string
    attendees: string
    agreements: string
    signatureStatus: SignatureStatus
    notes: string
  }[]
  referrals: { entity: ReferralEntity; officeNumber: string; referralDate: string; notes: string }[]
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
  /** Ausente en actas anteriores al registro formal y en la versión resumida. */
  case?: ActaCase
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
