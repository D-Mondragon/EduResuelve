import { createContext, useContext } from 'react'
import type { User } from '../types/user'

export interface AuthContextValue {
  user: User | null
  /** true mientras se valida la sesión guardada al abrir la app */
  initializing: boolean
  /** mensaje mostrado en el login cuando la sesión expiró */
  sessionMessage: string
  /** true si el usuario cerró sesión voluntariamente (no recordar la página de origen) */
  loggedOut: boolean
  login: (dni: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
  updateUser: (user: User) => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.')
  return context
}

/** Usuario autenticado (solo dentro de rutas protegidas). */
export function useCurrentUser(): User {
  const { user } = useAuth()
  if (!user) throw new Error('No hay un usuario autenticado.')
  return user
}
