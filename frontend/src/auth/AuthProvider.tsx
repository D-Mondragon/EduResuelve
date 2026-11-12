import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { api, ApiError, flushPerformance, getToken, setToken, UNAUTHORIZED_EVENT } from '../lib/api'
import type { User } from '../types/user'
import { AuthContext, type AuthContextValue } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [initializing, setInitializing] = useState(() => getToken() !== null)
  const [sessionMessage, setSessionMessage] = useState('')
  const [loggedOut, setLoggedOut] = useState(false)

  // Restaura la sesión guardada
  useEffect(() => {
    if (!getToken()) return
    let active = true
    api
      .me()
      .then((me) => {
        if (active) setUser(me)
      })
      .catch(() => {
        if (active) setToken(null)
      })
      .finally(() => {
        if (active) setInitializing(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Sesión expirada o cuenta desactivada desde otra pantalla
  useEffect(() => {
    function handleUnauthorized(event: Event) {
      setUser(null)
      setSessionMessage((event as CustomEvent<string>).detail ?? 'Tu sesión expiró.')
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [])

  const login = useCallback(async (dni: string, password: string) => {
    try {
      const result = await api.login(dni, password)
      if (!result.token || !result.user) return result.error ?? 'No se pudo iniciar sesión.'
      setToken(result.token)
      setSessionMessage('')
      setLoggedOut(false)
      setUser(result.user)
      return null
    } catch (error) {
      return error instanceof ApiError ? error.message : 'No se pudo iniciar sesión.'
    }
  }, [])

  const navigate = useNavigate()

  const logout = useCallback(async () => {
    // Las llamadas toman el token antes de borrarlo; si falla la red, la sesión local se elimina igual.
    void flushPerformance()
    const request = api.logout().catch(() => undefined)
    setToken(null)
    setUser(null)
    setSessionMessage('')
    setLoggedOut(true)
    navigate('/login', { replace: true })
    await request
  }, [navigate])

  const value = useMemo<AuthContextValue>(
    () => ({ user, initializing, sessionMessage, loggedOut, login, logout, updateUser: setUser }),
    [user, initializing, sessionMessage, loggedOut, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
