import {
  ArrowRight,
  ClipboardCheck,
  FilePlus2,
  MessageSquare,
  Paperclip,
  PencilLine,
  RefreshCcw,
  Scale,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'
import { formatDateTime } from '../../lib/format'
import { cn, statusBar } from '../../lib/ui'
import type { FollowUp, FollowUpKind } from '../../types/incident'
import { StatusBadge } from '../ui/Badge'

const kindIcons: Record<FollowUpKind, LucideIcon> = {
  Registro: FilePlus2,
  'Cambio de estado': ArrowRight,
  Asignación: UserCheck,
  Reasignación: RefreshCcw,
  Edición: PencilLine,
  Observación: MessageSquare,
  Evidencia: Paperclip,
  'Registro formal': ClipboardCheck,
  Convivencia: Scale,
}

export function Timeline({ entries, newestFirst = false }: { entries: FollowUp[]; newestFirst?: boolean }) {
  const ordered = newestFirst ? [...entries].reverse() : entries
  if (ordered.length === 0) {
    return <p className="text-sm text-muted">Aún no hay movimientos registrados.</p>
  }
  return (
    <ol className="relative space-y-6">
      {ordered.map((entry, index) => {
        const Icon = kindIcons[entry.kind]
        const changed = entry.previousStatus !== entry.newStatus && entry.newStatus
        return (
          <li className="relative flex gap-4" key={entry.id}>
            {index < ordered.length - 1 && (
              <span aria-hidden="true" className="absolute top-9 bottom-[-1.5rem] left-[1.0625rem] w-px bg-line" />
            )}
            <span
              className={cn(
                'relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full text-white ring-4 ring-surface',
                entry.newStatus ? statusBar[entry.newStatus] : 'bg-slate-400',
                !changed && 'bg-slate-400 dark:bg-slate-600',
              )}
            >
              <Icon aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-ink">
                  {entry.kind}
                  {entry.user && <span className="font-normal text-muted"> · {entry.user.fullName}</span>}
                </p>
                <time className="text-xs text-muted" dateTime={entry.createdAt}>
                  {formatDateTime(entry.createdAt)}
                </time>
              </div>
              {changed && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {entry.previousStatus && (
                    <>
                      <StatusBadge status={entry.previousStatus} />
                      <ArrowRight aria-label="pasó a" className="size-3.5 text-muted" />
                    </>
                  )}
                  {entry.newStatus && <StatusBadge status={entry.newStatus} />}
                </div>
              )}
              {entry.responsible && (
                <p className="mt-2 text-sm text-ink-2">
                  <span className="font-medium">Responsable:</span> {entry.responsible.fullName} ({entry.responsible.role})
                </p>
              )}
              {entry.reason && (
                <p className="mt-2 text-sm text-ink-2">
                  <span className="font-medium">Motivo:</span> {entry.reason}
                </p>
              )}
              {entry.observation && <p className="mt-1.5 text-sm leading-6 text-muted">{entry.observation}</p>}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
