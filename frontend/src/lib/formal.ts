import type { FormalFormData } from '../types/case'

export type FormalErrors = Partial<Record<keyof FormalFormData, string>>

export const emptyFormal: FormalFormData = { regime: '', incidentTime: '', immediateActions: '', objective: false }

/** Validación del registro formal del incidente (D.S. 021-2026-MINEDU, 8.2). */
export function validateFormal(values: FormalFormData): FormalErrors {
  const errors: FormalErrors = {}
  if (!values.regime) errors.regime = 'Selecciona el régimen aplicable.'
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(values.incidentTime)) errors.incidentTime = 'Indica la hora del hecho.'
  if (!values.immediateActions.trim()) {
    errors.immediateActions = 'Describe las acciones inmediatas (o indica que no fueron necesarias).'
  } else if (values.immediateActions.length > 1000) {
    errors.immediateActions = 'Máximo 1000 caracteres.'
  }
  if (!values.objective) errors.objective = 'Confirma que la descripción es objetiva.'
  return errors
}
