import { cn } from '../lib/ui'

/* Mascota de EduResuelve: zorro con la tableta escolar (fuente original en /iconos). */
export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <img alt="" aria-hidden="true" className="size-10 shrink-0 object-contain" height={160} src="/logo.webp" width={160} />
      {showText && <span className="text-lg font-semibold tracking-tight text-ink">EduResuelve</span>}
    </span>
  )
}
