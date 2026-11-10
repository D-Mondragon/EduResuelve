import { cn } from '../lib/ui'

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg aria-hidden="true" className="size-8 shrink-0" viewBox="0 0 64 64">
        <rect fill="#047857" height="64" rx="14" width="64" />
        <path
          d="M18 33.5 27.5 43 46 22"
          fill="none"
          stroke="#fff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="6"
        />
      </svg>
      {showText && <span className="text-lg font-semibold tracking-tight text-ink">EduResuelve</span>}
    </span>
  )
}
