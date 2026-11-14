import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Eye,
  FilePlus2,
  Hammer,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Lock,
  MessageSquareHeart,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'
import { useCallback } from 'react'
import { Link } from 'react-router'
import { useCurrentUser } from '../auth/authContext'
import { PriorityBadge, StatusBadge } from '../components/ui/Badge'
import { ButtonLink } from '../components/ui/Button'
import { Card, CardHeader, EmptyState, ErrorState, LoadingState, PageHeader, StatCard } from '../components/ui/Feedback'
import { useAsync } from '../hooks/useAsync'
import { api } from '../lib/api'
import { formatRelative } from '../lib/format'
import { isManager } from '../lib/permissions'
import { priorityBar, statusBar } from '../lib/ui'
import {
  incidentCategories,
  incidentPriorities,
  incidentStatuses,
  type IncidentSummary,
} from '../types/incident'
import type { User } from '../types/user'

function greeting(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('es-PE', { hour: 'numeric', hour12: false, timeZone: 'America/Lima' }).format(now))
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function IncidentList({ incidents, empty }: { incidents: IncidentSummary[]; empty: string }) {
  if (incidents.length === 0) {
    return <p className="px-5 py-8 text-center text-sm text-muted sm:px-6">{empty}</p>
  }
  return (
    <ul className="divide-y divide-line">
      {incidents.map((incident) => (
        <li key={incident.code}>
          <Link
            className="flex flex-col gap-2 px-5 py-3.5 hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none sm:flex-row sm:items-center sm:gap-4 sm:px-6"
            to={`/incidencias/${encodeURIComponent(incident.code)}`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{incident.code}</p>
              <p className="truncate text-sm font-medium text-ink">{incident.title}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <PriorityBadge priority={incident.priority} />
              <StatusBadge status={incident.status} />
              <span className="hidden w-24 text-right text-xs text-muted md:inline">{formatRelative(incident.updatedAt)}</span>
              <ArrowRight aria-hidden="true" className="hidden size-4 text-muted sm:block" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function Distribution({ title, items }: { title: string; items: Array<{ label: string; count: number; bar: string }> }) {
  const max = Math.max(1, ...items.map((item) => item.count))
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.label}>
            <div className="flex justify-between gap-3 text-sm">
              <span className="truncate text-ink-2">{item.label}</span>
              <span className="font-semibold tabular-nums text-ink">{item.count}</span>
            </div>
            <div
              aria-label={`${item.label}: ${item.count}`}
              aria-valuemax={max}
              aria-valuemin={0}
              aria-valuenow={item.count}
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2"
              role="meter"
            >
              <div className={`h-full rounded-full ${item.bar}`} style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function PendingQueue({
  title,
  icon: Icon,
  tone,
  incidents,
  to,
}: {
  title: string
  icon: LucideIcon
  tone: string
  incidents: IncidentSummary[]
  to: string
}) {
  return (
    <Link
      className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-4 shadow-sm transition hover:border-emerald-500/50 hover:shadow focus-visible:outline-2 focus-visible:outline-emerald-600"
      to={to}
    >
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink-2">{title}</span>
        <span className="block text-2xl font-semibold tabular-nums text-ink">{incidents.length}</span>
      </span>
      <ArrowRight aria-hidden="true" className="size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-emerald-600" />
    </Link>
  )
}

function ManagerDashboard({ incidents }: { incidents: IncidentSummary[] }) {
  const byStatus = (status: IncidentSummary['status']) => incidents.filter((i) => i.status === status)
  const pendingReassign = incidents.filter((i) => i.pendingReassignment)
  // Faltas graves o muy graves sin constancia de que Dirección tomó conocimiento (D.S. 021-2026-MINEDU, 8.2)
  const directorPending = incidents.filter((i) => i.directorPending)
  const active = incidents.filter((i) => !['Cerrado', 'Descartado'].includes(i.status))

  return (
    <>
      {directorPending.length > 0 && (
        <section
          aria-label="Faltas graves pendientes de Dirección"
          className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-start dark:border-rose-400/30 dark:bg-rose-400/10"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-rose-700 dark:text-rose-300" />
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-rose-900 dark:text-rose-200">
              {directorPending.length === 1
                ? '1 falta grave pendiente de que Dirección tome conocimiento'
                : `${directorPending.length} faltas graves pendientes de que Dirección tome conocimiento`}
            </p>
            <ul className="mt-1 space-y-0.5">
              {directorPending.slice(0, 5).map((i) => (
                <li key={i.code}>
                  <Link
                    className="font-medium text-rose-800 underline-offset-2 hover:underline dark:text-rose-300"
                    to={`/incidencias/${encodeURIComponent(i.code)}/convivencia`}
                  >
                    {i.code}
                  </Link>{' '}
                  <span className="text-rose-800/90 dark:text-rose-300/90">· {i.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section aria-label="Pendientes de gestión">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Requiere tu atención</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PendingQueue
            icon={Inbox}
            incidents={byStatus('Nuevo')}
            title="Por revisar"
            to="/incidencias?estado=Nuevo"
            tone="bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300"
          />
          <PendingQueue
            icon={UserCheck}
            incidents={byStatus('En revisión')}
            title="Por asignar"
            to="/incidencias?estado=En%20revisi%C3%B3n"
            tone="bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300"
          />
          <PendingQueue
            icon={ClipboardCheck}
            incidents={byStatus('Resuelto')}
            title="Por cerrar"
            to="/incidencias?estado=Resuelto"
            tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
          />
          <PendingQueue
            icon={AlertTriangle}
            incidents={pendingReassign}
            title="Por reasignar"
            to="/incidencias?reasignar=1"
            tone="bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
          />
        </div>
      </section>

      <section aria-label="Indicadores generales" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={ClipboardList} label="Total de incidencias" value={incidents.length} />
        <StatCard
          icon={Hammer}
          label="Activas"
          tone="bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
          value={active.length}
        />
        <StatCard
          icon={CheckCircle2}
          label="Resueltas"
          tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
          value={byStatus('Resuelto').length}
        />
        <StatCard
          icon={Lock}
          label="Cerradas"
          tone="bg-slate-100 text-slate-700 dark:bg-slate-400/10 dark:text-slate-300"
          value={byStatus('Cerrado').length}
        />
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Distribution
          items={incidentStatuses.map((status) => ({ label: status, count: byStatus(status).length, bar: statusBar[status] }))}
          title="Por estado"
        />
        <Distribution
          items={incidentPriorities.map((priority) => ({
            label: priority,
            count: incidents.filter((i) => i.priority === priority).length,
            bar: priorityBar[priority],
          }))}
          title="Por prioridad"
        />
        <Distribution
          items={incidentCategories.map((category) => ({
            label: category,
            count: incidents.filter((i) => i.category === category).length,
            bar: 'bg-emerald-600',
          }))}
          title="Por categoría"
        />
      </div>

      <Card>
        <CardHeader
          action={
            <Link className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400" to="/incidencias">
              Ver todas
            </Link>
          }
          description="Ordenadas por última actualización"
          icon={ListChecks}
          title="Actividad reciente"
        />
        <IncidentList empty="No hay incidencias registradas." incidents={incidents.slice(0, 6)} />
      </Card>
    </>
  )
}

/** Recordatorio de encuestas pendientes (RN-012) para quien registró incidencias ya cerradas. */
function PendingSurveys({ incidents }: { incidents: IncidentSummary[] }) {
  const pending = incidents.filter((i) => i.allowedActions.includes('survey'))
  if (pending.length === 0) return null
  const first = pending[0]
  return (
    <section
      aria-label="Encuestas pendientes"
      className="flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-amber-400/30 dark:bg-amber-400/10"
    >
      <div className="flex items-start gap-3">
        <MessageSquareHeart aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" />
        <div>
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {pending.length === 1
              ? 'Tienes 1 encuesta pendiente'
              : `Tienes ${pending.length} encuestas pendientes`}
          </p>
          <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-300/90">
            {pending.length === 1
              ? `Tu incidencia ${first.code} fue cerrada. Cuéntanos cómo te atendieron.`
              : 'Algunas de tus incidencias fueron cerradas. Cuéntanos cómo te atendieron.'}
          </p>
        </div>
      </div>
      <ButtonLink className="shrink-0" icon={MessageSquareHeart} to={`/incidencias/${encodeURIComponent(first.code)}/encuesta`}>
        Evaluar la atención
      </ButtonLink>
    </section>
  )
}

function PersonalDashboard({ user, incidents }: { user: User; incidents: IncidentSummary[] }) {
  const assigned = incidents.filter(
    (i) => i.responsible?.id === user.id && ['Asignado', 'En atención'].includes(i.status),
  )
  const mine = incidents.filter((i) => i.reporter?.id === user.id)
  const open = mine.filter((i) => !['Cerrado', 'Descartado'].includes(i.status))

  return (
    <>
      <section aria-label="Resumen personal" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {user.role === 'Docente' && (
          <StatCard
            icon={Hammer}
            label="Asignadas a mí"
            tone="bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
            value={assigned.length}
          />
        )}
        <StatCard icon={ClipboardList} label="Registradas por mí" value={mine.length} />
        <StatCard
          icon={Eye}
          label="En curso"
          tone="bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300"
          value={open.length}
        />
        <StatCard
          icon={CheckCircle2}
          label="Resueltas o cerradas"
          tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
          value={mine.filter((i) => ['Resuelto', 'Cerrado'].includes(i.status)).length}
        />
      </section>

      {user.role === 'Docente' && (
        <Card>
          <CardHeader
            description="Incidencias que tienes a cargo y requieren acción"
            icon={Hammer}
            title="Mis pendientes"
          />
          <IncidentList empty="No tienes incidencias asignadas pendientes. ¡Todo al día!" incidents={assigned} />
        </Card>
      )}

      <Card>
        <CardHeader
          action={
            <Link className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400" to="/incidencias">
              Ver todas
            </Link>
          }
          description="Sigue el estado de lo que registraste"
          icon={ClipboardList}
          title="Mis incidencias"
        />
        {mine.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState
              action={
                <ButtonLink icon={FilePlus2} to="/incidencias/nueva">
                  Registrar incidencia
                </ButtonLink>
              }
              description="Cuando registres una incidencia podrás seguir aquí cada cambio de estado."
              icon={Inbox}
              title="Aún no registraste incidencias"
            />
          </div>
        ) : (
          <IncidentList empty="" incidents={mine.slice(0, 8)} />
        )}
      </Card>
    </>
  )
}

function DashboardPage() {
  const user = useCurrentUser()
  const load = useCallback(() => api.listIncidents(), [])
  const { data, error, loading, reload } = useAsync(load)
  const manager = isManager(user.role)

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <ButtonLink icon={FilePlus2} to="/incidencias/nueva">
            Registrar incidencia
          </ButtonLink>
        }
        description={
          manager ? 'Resumen general de incidencias de la institución.' : 'Resumen de tus incidencias y pendientes.'
        }
        icon={LayoutDashboard}
        title={`${greeting()}, ${user.nombres}`}
      />
      {loading && !data ? (
        <LoadingState />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={() => reload()} />
      ) : (
        <>
          <PendingSurveys incidents={data ?? []} />
          {manager ? <ManagerDashboard incidents={data ?? []} /> : <PersonalDashboard incidents={data ?? []} user={user} />}
        </>
      )}
    </div>
  )
}

export default DashboardPage
