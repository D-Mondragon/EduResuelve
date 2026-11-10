import { useCallback, useEffect, useState } from 'react'

export interface AsyncState<T> {
  data: T | undefined
  error: Error | undefined
  loading: boolean
  /** Vuelve a cargar; con silent=true mantiene los datos visibles mientras recarga. */
  reload: (silent?: boolean) => void
}

/**
 * Carga datos de forma asíncrona. `load` debe estar memorizada con useCallback;
 * cada vez que cambie se vuelve a ejecutar.
 */
export function useAsync<T>(load: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<{ data?: T; error?: Error; loading: boolean; source?: unknown }>({
    loading: true,
  })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    load()
      .then((data) => {
        if (active) setState({ data, loading: false, source: load })
      })
      .catch((error: unknown) => {
        if (active) {
          setState((current) => ({
            data: current.source === load ? current.data : undefined,
            error: error instanceof Error ? error : new Error(String(error)),
            loading: false,
            source: load,
          }))
        }
      })
    return () => {
      active = false
    }
  }, [load, version])

  const reload = useCallback((silent = false) => {
    if (!silent) setState((current) => ({ ...current, loading: true, error: undefined }))
    setVersion((value) => value + 1)
  }, [])

  // Si cambió la función de carga (otra incidencia), no mostrar datos de la anterior
  const stale = state.source !== undefined && state.source !== load
  return {
    data: stale ? undefined : state.data,
    error: stale ? undefined : state.error,
    loading: stale || state.loading,
    reload,
  }
}
