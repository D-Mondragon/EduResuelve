import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCw,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/ui'
import { Button } from './Button'

type Tone = 'info' | 'success' | 'warning' | 'error'

const toneStyles: Record<Tone, { box: string; icon: LucideIcon }> = {
  info: {
    box: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-200',
    icon: Info,
  },
  success: {
    box: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200',
    icon: CheckCircle2,
  },
  warning: {
    box: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200',
    icon: AlertTriangle,
  },
  error: {
    box: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200',
    icon: XCircle,
  },
}

export function Alert({
  tone = 'info',
  title,
  children,
  className,
  action,
}: {
  tone?: Tone
  title?: string
  children?: ReactNode
  className?: string
  action?: ReactNode
}) {
  const { box, icon: Icon } = toneStyles[tone]
  return (
    <div
      className={cn('flex gap-3 rounded-lg border px-4 py-3 text-sm leading-6', box, className)}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : undefined}>{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  )
}

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted" role="status">
      <Loader2 aria-hidden="true" className="size-5 animate-spin" />
      {label}
    </span>
  )
}

export function LoadingState({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner label={label} />
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="mx-auto max-w-xl py-10">
      <Alert
        tone="error"
        title="No se pudo cargar la información"
        action={
          onRetry && (
            <Button icon={RefreshCw} size="sm" variant="secondary" onClick={onRetry}>
              Reintentar
            </Button>
          )
        }
      >
        {error.message}
      </Alert>
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-muted">
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <p className="mt-4 text-base font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm leading-6 text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: string
  description?: string
  icon?: LucideIcon
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 sm:flex dark:bg-emerald-400/10 dark:text-emerald-300">
            <Icon aria-hidden="true" className="size-6" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 text-sm leading-6 text-muted sm:text-base">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2 print:hidden">{actions}</div>}
    </header>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn('rounded-xl border border-line bg-surface shadow-sm', className)}>{children}</section>
}

export function CardHeader({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string
  description?: string
  icon?: LucideIcon
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon && <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-400" />}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300',
  hint,
}: {
  label: string
  value: number | string
  icon: LucideIcon
  tone?: string
  hint?: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-surface p-4 shadow-sm">
      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', tone)}>
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted sm:text-sm">{label}</p>
        <p className="text-2xl font-semibold tabular-nums text-ink">{value}</p>
        {hint && <p className="truncate text-xs text-muted">{hint}</p>}
      </div>
    </div>
  )
}

export function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm leading-6 text-ink">{children}</dd>
    </div>
  )
}
