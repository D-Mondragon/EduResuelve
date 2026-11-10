export const auditActions = [
  'Inicio de sesión',
  'Registro de incidencia',
  'Cambio de estado',
  'Asignación',
  'Derivación',
  'Seguimiento',
  'Registro de evidencia',
  'Resolución',
  'Cierre',
  'Reapertura',
  'Actualización de usuario',
] as const

export type AuditAction = (typeof auditActions)[number]

export const auditModules = [
  'Autenticación',
  'Incidencias',
  'Seguimiento',
  'Evidencias',
  'Usuarios',
  'Resolución',
  'Cierre',
] as const

export type AuditModule = (typeof auditModules)[number]

export interface AuditLog {
  id: string
  timestamp: string
  userId: string
  userName: string
  action: AuditAction
  module: AuditModule
  entityId: string
  description: string
}