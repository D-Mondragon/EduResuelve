import { useCallback, useEffect, useRef, useState } from 'react'

export interface AsyncState<T> {
  data: T | undefined
  error: Error | undefined
  loading: boolean
  /** Hay una recarga silenciosa en curso (los datos anteriores siguen visibles). */
  refreshing: boolean
  /**
   * Vuelve a cargar; con silent=true mantiene los datos visibles mientras recarga.
   * La promesa se resuelve al terminar, con el error si la carga falló.
   */
  reload: (silent?: boolean) => Promise<Error | undefined>
}

/**
 * Carga datos de forma asíncrona. `load` debe estar memorizada con useCallback;
 * cada vez que cambie se vuelve a ejecutar.
 */
export function useAsync<T>(load: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<{ data?: T; error?: Error; loading: boolean; refreshing?: boolean; source?: unknown }>({
    loading: true,
  })
  const [version, setVersion] = useState(0)
  // Quienes esperan que termine la recarga en curso
  const waiters = useRef<((error: Error | undefined) => void)[]>([])

  useEffect(() => {
    let active = true
    const settle = (error: Error | undefined) => {
      const pending = waiters.current
      waiters.current = []
      for (const resolve of pending) resolve(error)
    }
    load()
      .then((data) => {
        if (!active) return
        setState({ data, loading: false, source: load })
        settle(undefined)
      })
      .catch((reason: unknown) => {
        if (!active) return
        const error = reason instanceof Error ? reason : new Error(String(reason))
        setState((current) => ({
          data: current.source === load ? current.data : undefined,
          error,
          loading: false,
          source: load,
        }))
        settle(error)
      })
    return () => {
      active = false
    }
  }, [load, version])

  const reload = useCallback(
    (silent = false) =>
      new Promise<Error | undefined>((resolve) => {
        waiters.current.push(resolve)
        setState((current) => (silent ? { ...current, refreshing: true } : { ...current, loading: true, error: undefined }))
        setVersion((value) => value + 1)
      }),
    [],
  )

  // Si cambió la función de carga (otra incidencia), no mostrar datos de la anterior
  const stale = state.source !== undefined && state.source !== load
  return {
    data: stale ? undefined : state.data,
    error: stale ? undefined : state.error,
    loading: stale || state.loading,
    refreshing: !stale && Boolean(state.refreshing),
    reload,
  }
}
