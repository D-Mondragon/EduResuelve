import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { useAuth } from '../auth/authContext'
import { AuthProvider } from '../auth/AuthProvider'
import { LoadingState } from '../components/ui/Feedback'
import { ToastProvider } from '../components/toast/ToastProvider'
import MainLayout from '../layouts/MainLayout'
import ActaPage from '../pages/ActaPage'
import AuditPage from '../pages/AuditPage'
import ChangePasswordPage from '../pages/ChangePasswordPage'
import DashboardPage from '../pages/DashboardPage'
import IncidentClosurePage from '../pages/IncidentClosurePage'
import IncidentDetailPage from '../pages/IncidentDetailPage'
import IncidentEvidencePage from '../pages/IncidentEvidencePage'
import IncidentFollowUpPage from '../pages/IncidentFollowUpPage'
import IncidentFormPage from '../pages/IncidentFormPage'
import IncidentResolutionPage from '../pages/IncidentResolutionPage'
import IncidentsPage from '../pages/IncidentsPage'
import LoginPage from '../pages/LoginPage'
import NotFoundPage from '../pages/NotFoundPage'
import UsersPage from '../pages/UsersPage'
import VerifyActaPage from '../pages/VerifyActaPage'
import type { UserRole } from '../types/user'

/** Exige sesión iniciada; si la contraseña es temporal, obliga a cambiarla. */
function RequireAuth() {
  const { user, initializing, loggedOut } = useAuth()
  const location = useLocation()

  if (initializing) return <LoadingState label="Verificando sesión…" />
  if (!user) {
    return <Navigate replace state={loggedOut ? undefined : { from: location.pathname + location.search }} to="/login" />
  }
  if (user.mustChangePassword && location.pathname !== '/cambiar-contrasena') {
    return <Navigate replace to="/cambiar-contrasena" />
  }
  return <Outlet />
}

function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { user } = useAuth()
  if (!user || !roles.includes(user.role)) return <NotFoundPage forbidden />
  return children
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth()
  const location = useLocation()
  if (initializing) return <LoadingState label="Verificando sesión…" />
  if (user) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate replace to={from && from !== '/login' ? from : '/dashboard'} />
  }
  return children
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Navigate replace to="/dashboard" />} path="/" />
      <Route
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
        path="/login"
      />
      {/* Pública: verificación de actas impresas (sin sesión) */}
      <Route element={<VerifyActaPage />} path="/verificar" />
      <Route element={<RequireAuth />}>
        <Route element={<ChangePasswordPage />} path="/cambiar-contrasena" />
        <Route element={<MainLayout />}>
          <Route element={<DashboardPage />} path="/dashboard" />
          <Route element={<IncidentsPage />} path="/incidencias" />
          <Route element={<IncidentFormPage />} path="/incidencias/nueva" />
          <Route element={<IncidentDetailPage />} path="/incidencias/:code" />
          <Route element={<IncidentFormPage />} path="/incidencias/:code/editar" />
          <Route element={<IncidentFollowUpPage />} path="/incidencias/:code/seguimiento" />
          <Route element={<IncidentEvidencePage />} path="/incidencias/:code/evidencias" />
          <Route element={<IncidentResolutionPage />} path="/incidencias/:code/resolucion" />
          <Route element={<IncidentClosurePage />} path="/incidencias/:code/cierre" />
          <Route element={<ActaPage />} path="/incidencias/:code/acta/:number" />
          <Route
            element={
              <RequireRole roles={['Administrador']}>
                <UsersPage />
              </RequireRole>
            }
            path="/usuarios"
          />
          <Route
            element={
              <RequireRole roles={['Administrador']}>
                <AuditPage />
              </RequireRole>
            }
            path="/auditoria"
          />
          <Route element={<NotFoundPage />} path="*" />
        </Route>
      </Route>
    </Routes>
  )
}

function AppRouter() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default AppRouter
