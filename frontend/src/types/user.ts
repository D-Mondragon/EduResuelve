export type UserRole =
  | 'Estudiante'
  | 'Docente'
  | 'Responsable de convivencia'
  | 'Orientador'
  | 'Administrador'

export const incidentResponsibleRoles: readonly UserRole[] = [
  'Docente',
  'Responsable de convivencia',
  'Orientador',
  'Administrador',
]

export type UserStatus = 'Activo' | 'Inactivo'

export interface User {
  id: string
  nombres: string
  apellidos: string
  email: string
  role: UserRole
  status: UserStatus
  createdAt: string
}