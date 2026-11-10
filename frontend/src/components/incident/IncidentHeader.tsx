import { ArrowLeft, Calendar, MapPin, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { formatDate } from '../../lib/format'
import type { IncidentSummary } from '../../types/incident'
import { PriorityBadge, StatusBadge } from '../ui/Badge'
import { Alert } from '../ui/Feedback'

interface IncidentHeaderProps {
  incident: IncidentSummary
  backTo?: string
  backLabel?: string
  /** Subtítulo de la sección (p. ej. "Seguimiento") */
  section?: string
  actions?: ReactNode
}

export function IncidentHeader({ incident, backTo, backLabel, section, actions }: IncidentHeaderProps) {
  const detailPath = `/incidencias/${encodeURIComponent(incident.code)}`
  return (
    <div className="space-y-4">
      <nav aria-label="Ruta de navegación" className="print:hidden">
        <Link
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-emerald-600"
          to={backTo ?? (section ? detailPath : '/incidencias')}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {backLabel ?? (section ? 'Volver al detalle' : 'Volver a incidencias')}
        </Link>
      </nav>
      <header className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            {incident.code}
            {section && <span className="font-medium text-muted"> · {section}</span>}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{incident.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={incident.status} />
            <PriorityBadge priority={incident.priority} withLabel />
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Calendar aria-hidden="true" className="size-3.5" />
              {formatDate(incident.incidentDate)}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <MapPin aria-hidden="true" className="size-3.5" />
              {incident.location}
            </span>
            {incident.responsible && (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <UserRound aria-hidden="true" className="size-3.5" />
                {incident.responsible.fullName}
              </span>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2 print:hidden">{actions}</div>}
      </header>
      {incident.pendingReassignment && (
        <Alert title="Pendiente de reasignación" tone="warning">
          El responsable asignado fue desactivado. Un Orientador o Administrador debe reasignar esta incidencia.
        </Alert>
      )}
    </div>
  )
}
