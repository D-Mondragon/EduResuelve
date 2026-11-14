import type { UserRef } from './user'

/* Registro formal y convivencia escolar: D.S. 021-2026-MINEDU (8.2, 9.1, IX), R.M. 383-2025-MINEDU y Ley 29719. */

export const regimes = ['Ninguno', 'Disciplina', 'Violencia', 'Disciplina y violencia'] as const
export type Regime = (typeof regimes)[number]

export const regimeHelp: Record<Regime, string> = {
  Ninguno: 'Infraestructura, trámites u otros hechos que no involucran la conducta de estudiantes.',
  Disciplina: 'Conducta de estudiantes que contraviene las normas de convivencia (D.S. 021-2026-MINEDU).',
  Violencia: 'Violencia escolar: se atiende con los protocolos de la R.M. 383-2025-MINEDU y se reporta en el SíseVe.',
  'Disciplina y violencia': 'Hecho de violencia entre estudiantes que, además, se atiende como falta disciplinaria.',
}

export const severities = ['Leve', 'Grave', 'Muy grave'] as const
export type Severity = (typeof severities)[number]

export const participantRoles = ['Estudiante afectado', 'Estudiante involucrado', 'Testigo'] as const
export type ParticipantRole = (typeof participantRoles)[number]

export const statementStatuses = ['Pendiente', 'Registrada', 'Se abstuvo'] as const
export type StatementStatus = (typeof statementStatuses)[number]

export const statementSources = ['Estudiante', 'Padre, madre o apoderado'] as const
export type StatementSource = (typeof statementSources)[number]

export const measureKinds = ['Formativa', 'Correctiva', 'Disciplinaria'] as const
export type MeasureKind = (typeof measureKinds)[number]

export const signatureStatuses = ['Firmada', 'Se negó a firmar', 'Pendiente de firma'] as const
export type SignatureStatus = (typeof signatureStatuses)[number]

export const referralEntities = ['DEMUNA', 'UPE', 'PNP', 'Fiscalía', 'UGEL', 'Centro de salud', 'Otra'] as const
export type ReferralEntity = (typeof referralEntities)[number]

export const violenceTypes = ['Física', 'Psicológica', 'Sexual'] as const
export type ViolenceType = (typeof violenceTypes)[number]

export const violenceModalities = ['Entre estudiantes', 'Del personal de la IE hacia estudiantes'] as const
export type ViolenceModality = (typeof violenceModalities)[number]

export interface CaseParticipant {
  id: number
  role: ParticipantRole
  fullName: string
  dni: string | null
  gradeSection: string
  statement: string
  statementStatus: StatementStatus
  statementBy: StatementSource | null
  statementAt: string | null
  createdAt: string
}

export interface CaseMeasure {
  id: number
  participantId: number
  participantName: string
  kind: MeasureKind
  description: string
  isSeparation: boolean
  decidedBy: UserRef | null
  decidedAt: string
}

export interface CaseMeeting {
  id: number
  meetingDate: string
  attendees: string
  agreements: string
  signatureStatus: SignatureStatus
  notes: string
  createdBy: UserRef | null
  createdAt: string
}

export interface CaseReferral {
  id: number
  entity: ReferralEntity
  officeNumber: string
  referralDate: string
  notes: string
  createdBy: UserRef | null
  createdAt: string
}

/** Datos del caso: solo los recibe el personal (Docente, Orientador, Administrador). */
export interface IncidentCase {
  regime: Regime
  incidentTime: string | null
  immediateActions: string
  formalRegisteredBy: UserRef | null
  formalRegisteredAt: string | null
  severity: Severity | null
  directorNotifiedAt: string | null
  directorLate: boolean | null
  directorAckBy: UserRef | null
  directorAckAt: string | null
  violenceType: ViolenceType | null
  violenceModality: ViolenceModality | null
  siseveCode: string | null
  bookFolio: string | null
  canManage: boolean
  canDecideSevere: boolean
  participants: CaseParticipant[]
  measures: CaseMeasure[]
  meetings: CaseMeeting[]
  referrals: CaseReferral[]
}

export interface FormalFormData {
  regime: Regime | ''
  incidentTime: string
  immediateActions: string
  objective: boolean
}

export type CaseKind = 'participant' | 'measure' | 'meeting' | 'referral'

export interface CaseUpdate {
  severity?: Severity
  violenceType?: ViolenceType | ''
  violenceModality?: ViolenceModality | ''
  siseveCode?: string
  bookFolio?: string
}

export function hasDiscipline(regime: Regime | null | undefined): boolean {
  return regime === 'Disciplina' || regime === 'Disciplina y violencia'
}

export function hasViolence(regime: Regime | null | undefined): boolean {
  return regime === 'Violencia' || regime === 'Disciplina y violencia'
}
