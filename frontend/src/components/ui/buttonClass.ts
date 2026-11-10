import { cn } from '../../lib/ui'

export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type Size = 'sm' | 'md'

const variants: Record<Variant, string> = {
  primary:
    'bg-emerald-700 text-white shadow-sm hover:bg-emerald-800 disabled:bg-slate-300 disabled:text-slate-500 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400',
  secondary:
    'border border-line bg-surface text-ink-2 shadow-sm hover:bg-surface-2 hover:text-ink disabled:opacity-50',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-50',
  danger:
    'bg-rose-700 text-white shadow-sm hover:bg-rose-800 disabled:bg-slate-300 disabled:text-slate-500 dark:bg-rose-600 dark:hover:bg-rose-500',
}

const sizes: Record<Size, string> = {
  sm: 'gap-1.5 px-3 py-1.5 text-sm',
  md: 'gap-2 px-4 py-2.5 text-sm',
}

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(
    'inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed',
    variants[variant],
    sizes[size],
    size === 'sm' && 'min-h-9',
    className,
  )
}

