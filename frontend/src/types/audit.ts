export const auditModules = [
  'Autenticación',
  'Incidencias',
  'Seguimiento',
  'Evidencias',
  'Resolución',
  'Cierre',
  'Actas',
  'Encuestas',
  'Reportes',
  'Usuarios',
  'Sistema',
] as const
export type AuditModule = (typeof auditModules)[number]

export interface AuditLog {
  id: number
  timestamp: string
  userId: string | null
  userName: string
  dni: string | null
  action: string
  module: AuditModule
  entityId: string
  description: string
}

export interface AppNotification {
  id: number
  incidentCode: string | null
  title: string
  body: string
  read: boolean
  createdAt: string
}

export interface NotificationList {
  unread: number
  items: AppNotification[]
}
