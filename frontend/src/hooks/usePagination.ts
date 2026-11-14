import { useCallback } from 'react'
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, paginate } from '../lib/reports'
import { useQueryParams } from './useQueryParams'

/**
 * Paginación guardada en la URL (?pagina=2&tam=50), igual que en Reportes: se conserva al volver
 * desde un detalle y se puede compartir el enlace.
 */
export function usePagination(total: number) {
  const [params, updateParams] = useQueryParams()
  const requestedSize = Number(params.get('tam'))
  const size = (PAGE_SIZES as readonly number[]).includes(requestedSize) ? requestedSize : DEFAULT_PAGE_SIZE
  const info = paginate(total, Number(params.get('pagina')) || 1, size)

  // Se calcula sobre la página actual de la URL: varios clics seguidos avanzan una página cada uno
  const onStep = useCallback(
    (delta: number, totalPages: number) =>
      updateParams((next) => {
        const target = Math.min(Math.max(1, (Number(next.get('pagina')) || 1) + delta), totalPages)
        if (target > 1) next.set('pagina', String(target))
        else next.delete('pagina')
      }),
    [updateParams],
  )
  const onSize = useCallback(
    (value: number) =>
      updateParams((next) => {
        if (value === DEFAULT_PAGE_SIZE) next.delete('tam')
        else next.set('tam', String(value))
        next.delete('pagina')
      }),
    [updateParams],
  )
  /** Vuelve a la primera página (al cambiar un filtro). */
  const resetPage = useCallback(() => updateParams((next) => next.delete('pagina')), [updateParams])

  return { info, size, onStep, onSize, resetPage }
}
