import { Flag } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn, priorityStyles, roleStyles, statusIcons, statusStyles } from '../../lib/ui'
import type { IncidentPriority, IncidentStatus } from '../../types/incident'
import type { UserRole, UserStatus } from '../../types/user'

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const Icon = statusIcons[status]
  return (
    <Badge className={statusStyles[status]}>
      <Icon aria-hidden="true" className="size-3.5" />
      {status}
    </Badge>
  )
}

export function PriorityBadge({ priority, withLabel = false }: { priority: IncidentPriority; withLabel?: boolean }) {
  return (
    <Badge className={priorityStyles[priority]}>
      <Flag aria-hidden="true" className="size-3.5" />
      {withLabel ? `Prioridad ${priority.toLowerCase()}` : priority}
    </Badge>
  )
}

export function RoleBadge({ role }: { role: UserRole }) {
  return <Badge className={roleStyles[role]}>{role}</Badge>
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <Badge
      className={
        status === 'Activo'
          ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/30'
          : 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-400/10 dark:text-slate-400 dark:ring-slate-400/30'
      }
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5 rounded-full', status === 'Activo' ? 'bg-emerald-500' : 'bg-slate-400')}
      />
      {status}
    </Badge>
  )
}
