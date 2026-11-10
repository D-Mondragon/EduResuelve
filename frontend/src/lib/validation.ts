import { todayInLima } from './format'
import type { IncidentFormData } from '../types/incident'

export const passwordRules = [
  { label: 'Al menos 8 caracteres', test: (value: string) => value.length >= 8 },
  { label: 'Incluye letras', test: (value: string) => /[A-Za-z]/.test(value) },
  { label: 'Incluye números', test: (value: string) => /\d/.test(value) },
]

export function isValidPassword(value: string): boolean {
  return passwordRules.every((rule) => rule.test(value))
}

export function isValidDni(value: string): boolean {
  return /^\d{8}$/.test(value)
}

export function isValidEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim())
}

export function initials(fullName: string): string {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

/** Genera una contraseña temporal legible que cumple la política. */
export function generateTemporaryPassword(random: () => number = Math.random): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'
  const digits = '23456789'
  const pick = (source: string) => source[Math.floor(random() * source.length)]
  let password = ''
  for (let i = 0; i < 6; i++) password += pick(letters)
  for (let i = 0; i < 4; i++) password += pick(digits)
  return password
}

export type IncidentFormErrors = Partial<Record<keyof IncidentFormData, string>>

export function validateIncidentForm(values: IncidentFormData, today = todayInLima()): IncidentFormErrors {
  const errors: IncidentFormErrors = {}
  if (!values.title.trim()) errors.title = 'Ingresa un título que resuma lo ocurrido.'
  if (!values.description.trim()) errors.description = 'Describe lo ocurrido con el mayor detalle posible.'
  if (!values.category) errors.category = 'Selecciona una categoría.'
  if (!values.priority) errors.priority = 'Selecciona una prioridad.'
  if (!values.incidentDate) errors.incidentDate = 'Selecciona la fecha en que ocurrió.'
  else if (values.incidentDate > today) errors.incidentDate = 'La fecha no puede ser futura.'
  if (!values.location.trim()) errors.location = 'Indica dónde ocurrió.'
  if (values.involvedPeople.length > 200) errors.involvedPeople = 'Máximo 200 caracteres.'
  return errors
}
