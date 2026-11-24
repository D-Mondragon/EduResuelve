import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PAGE_SIZES, type PageInfo } from '../../lib/reports'
import { cn } from '../../lib/ui'
import { Button } from './Button'
import { controlClass } from './Field'

/**
 * Paginación de listados (Reportes, Incidencias, Auditoría, Usuarios): rango visible, filas por página
 * y botones Anterior / Siguiente. No se imprime.
 */
export function Pagination({
  info,
  size,
  label,
  onStep,
  onSize,
  className,
}: {
  info: PageInfo
  size: number
  label: string
  onStep: (delta: number, totalPages: number) => void
  onSize: (size: number) => void
  className?: string
}) {
  if (info.total === 0) return null
  return (
    // Teléfono: dos filas ordenadas (rango + filas por página; Anterior · página · Siguiente a lo ancho).
    // Desde 640 px: una sola fila, con el rango a la izquierda y los controles a la derecha.
    <nav
      aria-label={`Paginación de ${label}`}
      className={cn(
        'grid grid-cols-[1fr_auto] items-center gap-3 border-t border-line px-5 py-3 sm:flex sm:px-6 print:hidden',
        className,
      )}
    >
      <p aria-live="polite" className="text-sm text-muted">
        Mostrando <span className="font-medium text-ink">{info.start + 1}–{info.end}</span> de{' '}
        <span className="font-medium text-ink">{info.total}</span>
      </p>
      <label className="flex items-center gap-2 whitespace-nowrap text-sm text-muted sm:ml-auto" htmlFor={`page-size-${label}`}>
        <span className="sm:hidden">Filas</span>
        <span className="hidden sm:inline">Filas por página</span>
        <select
          aria-label="Filas por página"
          className={cn(controlClass, 'w-auto py-1.5')}
          id={`page-size-${label}`}
          onChange={(e) => onSize(Number(e.target.value))}
          value={size}
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <div className="col-span-2 flex items-center justify-between gap-2">
        <Button disabled={info.page <= 1} icon={ChevronLeft} onClick={() => onStep(-1, info.totalPages)} size="sm" variant="secondary">
          Anterior
        </Button>
        <span className="text-center text-sm tabular-nums text-ink-2 sm:min-w-24">
          <span className="hidden sm:inline">Página </span>
          {info.page} de {info.totalPages}
        </span>
        <Button disabled={info.page >= info.totalPages} onClick={() => onStep(1, info.totalPages)} size="sm" variant="secondary">
          Siguiente
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </nav>
  )
}
