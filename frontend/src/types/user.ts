export const userRoles = ['Estudiante', 'Docente', 'Orientador', 'Administrador'] as const
export type UserRole = (typeof userRoles)[number]

/** Roles que pueden ser responsables de una incidencia (RN-004). */
export const responsibleRoles: readonly UserRole[] = ['Docente', 'Orientador', 'Administrador']

/** Roles que gestionan el flujo completo: revisar, asignar, cerrar. */
export const managerRoles: readonly UserRole[] = ['Orientador', 'Administrador']

export type UserStatus = 'Activo' | 'Inactivo'

export interface User {
  id: string
  code: string
  dni: string
  nombres: string
  apellidos: string
  fullName: string
  email: string
  role: UserRole
  status: UserStatus
  mustChangePassword: boolean
  lastLoginAt: string | null
  createdAt: string
}

export interface ManagedUser extends User {
  activeAssignments: number
  isLocked: boolean
}

export interface UserRef {
  id: string
  fullName: string
  role: UserRole
  email: string
  status: UserStatus
}

export interface UserFormData {
  dni: string
  nombres: string
  apellidos: string
  email: string
  role: UserRole
  password?: string
}
