import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/**
 * Parámetros de la URL con actualizaciones acumulativas.
 *
 * La forma funcional de setSearchParams de react-router parte de los parámetros del último
 * renderizado: si dos cambios ocurren antes de volver a renderizar (p. ej. "Limpiar filtros" y
 * enseguida elegir un estado), el segundo deshace el primero. Aquí cada cambio parte siempre de la
 * URL actual del navegador, que react-router actualiza de forma inmediata al navegar.
 */
export function useQueryParams() {
  const [params, setParams] = useSearchParams()
  const update = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(window.location.search)
      mutate(next)
      setParams(next, { replace: true })
    },
    [setParams],
  )
  return [params, update] as const
}
