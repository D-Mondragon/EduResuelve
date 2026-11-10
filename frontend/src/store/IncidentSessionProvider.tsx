import { useReducer, type ReactNode } from 'react'
import { mockUsers } from '../data/mockUsers'
import {
  createInitialIncidentSessionState,
  IncidentSessionContext,
  incidentSessionReducer,
  incidentTransitions,
} from './incidentSession'
import type {
  Closure,
  FollowUp,
  IncidentStatus,
  Resolution,
} from '../types/incident'
import { incidentResponsibleRoles } from '../types/user'

function IncidentSessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    incidentSessionReducer,
    undefined,
    createInitialIncidentSessionState,
  )

  function applyTransition(
    incidentId: string,
    nextStatus: IncidentStatus,
    observation: string,
    user: string,
    extra: {
      responsibleUserId?: string
      responsibleLabel?: string
      reason?: string
      resolution?: Resolution
      closure?: Closure
    } = {},
  ) {
    const incident = state.incidents.find((item) => item.id === incidentId)
    if (!incident || !incidentTransitions[incident.status].includes(nextStatus)) {
      return false
    }

    const updatedAt = new Date().toISOString()
    const timeIndex = updatedAt.indexOf('T')
    const followUp: FollowUp = {
      id: Math.max(0, ...state.followUps.map((item) => item.id)) + 1,
      incidentId,
      status: nextStatus,
      previousStatus: incident.status,
      newStatus: nextStatus,
      date: updatedAt.slice(0, timeIndex),
      time: updatedAt.slice(timeIndex + 1, timeIndex + 6),
      user,
      observation,
      ...(extra.responsibleUserId
        ? { responsibleUserId: extra.responsibleUserId }
        : {}),
      ...(extra.reason ? { reason: extra.reason } : {}),
    }

    dispatch({
      type: 'incident-transition',
      incidentId,
      previousStatus: incident.status,
      nextStatus,
      updatedAt,
      followUp,
      ...extra,
    })
    return true
  }

  function recordFollowUp(
    incidentId: string,
    nextStatus: IncidentStatus,
    observation: string,
    responsibleUserId?: string,
    reason?: string,
  ) {
    if (!observation.trim()) return false

    const incident = state.incidents.find((item) => item.id === incidentId)
    if (!incident || !incidentTransitions[incident.status].includes(nextStatus)) {
      return false
    }

    const isDiscard =
      incident.status === 'En revisión' && nextStatus === 'Descartado'
    const isReopen = incident.status === 'Cerrado' && nextStatus === 'En revisión'
    if ((isDiscard || isReopen) && !reason?.trim()) return false
    if (!isDiscard && !isReopen && reason?.trim()) return false

    if (nextStatus === 'Asignado') {
      if (incident?.status !== 'En revisión' || !responsibleUserId) return false

      const responsibleUser = mockUsers.find(
        (user) =>
          user.id === responsibleUserId &&
          user.status === 'Activo' &&
          incidentResponsibleRoles.includes(user.role),
      )
      if (!responsibleUser) return false

      return applyTransition(
        incidentId,
        nextStatus,
        observation.trim(),
        'Usuario de prueba',
        {
          responsibleUserId: responsibleUser.id,
          responsibleLabel: `${responsibleUser.nombres} ${responsibleUser.apellidos}, ${responsibleUser.role}`,
          ...(reason ? { reason: reason.trim() } : {}),
        },
      )
    }

    if (responsibleUserId) return false
    return applyTransition(
      incidentId,
      nextStatus,
      observation.trim(),
      'Usuario de prueba',
      reason?.trim() ? { reason: reason.trim() } : {},
    )
  }

  function recordResolution(
    incidentId: string,
    resolution: Resolution,
  ) {
    const incident = state.incidents.find((item) => item.id === incidentId)
    if (incident?.status !== 'En atención' || incident.resolution) return false

    return applyTransition(
      incidentId,
      'Resuelto',
      `Resolución registrada: ${resolution.summary}`,
      resolution.registeredBy,
      { resolution },
    )
  }

  function recordClosure(
    incidentId: string,
    closure: Closure,
  ) {
    const incident = state.incidents.find((item) => item.id === incidentId)
    if (incident?.status !== 'Resuelto' || !incident.resolution || incident.closure) {
      return false
    }

    const observation = closure.closureObservations.trim()
      ? `Cierre registrado: ${closure.closureObservations.trim()}`
      : 'Incidencia cerrada tras confirmar la resolución.'

    return applyTransition(
      incidentId,
      'Cerrado',
      observation,
      closure.closedBy,
      { closure },
    )
  }

  return (
    <IncidentSessionContext.Provider
      value={{ ...state, recordFollowUp, recordResolution, recordClosure }}
    >
      {children}
    </IncidentSessionContext.Provider>
  )
}

export default IncidentSessionProvider