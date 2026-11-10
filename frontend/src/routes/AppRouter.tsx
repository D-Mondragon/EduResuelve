import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import AuditPage from '../pages/AuditPage'
import DashboardPage from '../pages/DashboardPage'
import IncidentClosurePage from '../pages/IncidentClosurePage'
import IncidentDetailPage from '../pages/IncidentDetailPage'
import IncidentEvidencePage from '../pages/IncidentEvidencePage'
import IncidentFollowUpPage from '../pages/IncidentFollowUpPage'
import IncidentResolutionPage from '../pages/IncidentResolutionPage'
import IncidentsPage from '../pages/IncidentsPage'
import LoginPage from '../pages/LoginPage'
import NewIncidentPage from '../pages/NewIncidentPage'
import UsersPage from '../pages/UsersPage'
import MainLayout from '../layouts/MainLayout'
import IncidentSessionProvider from '../store/IncidentSessionProvider'

function AppRouter() {
  return (
    <BrowserRouter>
      <IncidentSessionProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/auditoria" element={<AuditPage />} />
            <Route path="/usuarios" element={<UsersPage />} />
            <Route path="/incidencias" element={<IncidentsPage />} />
            <Route path="/incidencias/nueva" element={<NewIncidentPage />} />
            <Route path="/incidencias/:id" element={<IncidentDetailPage />} />
            <Route
              path="/incidencias/:id/evidencias"
              element={<IncidentEvidencePage />}
            />
            <Route
              path="/incidencias/:id/seguimiento"
              element={<IncidentFollowUpPage />}
            />
            <Route
              path="/incidencias/:id/resolucion"
              element={<IncidentResolutionPage />}
            />
            <Route
              path="/incidencias/:id/cierre"
              element={<IncidentClosurePage />}
            />
          </Route>
        </Routes>
      </IncidentSessionProvider>
    </BrowserRouter>
  )
}

export default AppRouter