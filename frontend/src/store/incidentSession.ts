import { createContext, useContext } from 'react'
import { mockFollowUps, mockIncidents } from '../data/mockIncidents'
import type {
  Closure,
  FollowUp,
  Incident,
  IncidentStatus,
  Resolution,
} from '../types/incident'

export const incidentTransitions: Record<IncidentStatus, readonly IncidentStatus[]> = {
  Nuevo: ['En revisión'],
  'En revisión': ['Asignado', 'Descartado'],
  Asignado: ['En atención'],
  'En atención': ['Resuelto'],
  Resuelto: ['Cerrado'],
  Cerrado: ['En revisión'],
  Descartado: [],
}

export interface IncidentSessionState {
  incidents: Incident[]
  followUps: FollowUp[]
}

export interface IncidentTransitionAction {
  type: 'incident-transition'
  incidentId: string
  previousStatus: IncidentStatus
  nextStatus: IncidentStatus
  updatedAt: string
  followUp: FollowUp
  responsibleUserId?: string
  responsibleLabel?: string
  resolution?: Resolution
  closure?: Closure
}

export interface IncidentSessionContextValue extends IncidentSessionState {
  recordFollowUp: (
    incidentId: string,
    nextStatus: IncidentStatus,
    observation: string,
    responsibleUserId?: string,
    reason?: string,
  ) => boolean
  recordResolution: (incidentId: string, resolution: Resolution) => boolean
  recordClosure: (incidentId: string, closure: Closure) => boolean
}

export const IncidentSessionContext =
  createContext<IncidentSessionContextValue | undefined>(undefined)

export function createInitialIncidentSessionState(): IncidentSessionState {
  return {
    incidents: mockIncidents.map((incident) => ({ ...incident })),
    followUps: mockFollowUps.map((followUp) => ({ ...followUp })),
  }
}

export function incidentSessionReducer(
  state: IncidentSessionState,
  action: IncidentTransitionAction,
): IncidentSessionState {
  const currentIncident = state.incidents.find(
    (incident) => incident.id === action.incidentId,
  )
  if (
    !currentIncident ||
    currentIncident.status !== action.previousStatus ||
    !incidentTransitions[currentIncident.status].includes(action.nextStatus)
  ) {
    return state
  }

  return {
    incidents: state.incidents.map((incident) =>
      incident.id === action.incidentId
        ? {
            ...incident,
            status: action.nextStatus,
            updatedAt: action.updatedAt,
            ...(action.responsibleUserId
              ? {
                  responsibleUserId: action.responsibleUserId,
                  responsible: action.responsibleLabel ?? incident.responsible,
                }
              : {}),
            ...(action.resolution ? { resolution: action.resolution } : {}),
            ...(action.closure ? { closure: action.closure } : {}),
          }
        : incident,
    ),
    followUps: [...state.followUps, action.followUp],
  }
}

export function useIncidentSession() {
  const context = useContext(IncidentSessionContext)
  if (!context) {
    throw new Error('useIncidentSession debe usarse dentro de IncidentSessionProvider.')
  }
  return context
}