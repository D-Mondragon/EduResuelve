import { Home, RefreshCw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { isChunkLoadError } from '../lib/chunkError'
import { Alert } from './ui/Feedback'
import { Button } from './ui/Button'

const RELOAD_KEY = 'eduresuelve.recarga-version'

/** Recarga una sola vez por minuto para no entrar en un ciclo si el problema persiste. */
function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
    if (Date.now() - last < 60_000) return false
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    return false
  }
  window.location.reload()
  return true
}

interface Props {
  children: ReactNode
  /** Al cambiar (otra ruta), se limpia el error y se vuelve a intentar. */
  resetKey?: string
}

interface State {
  error: Error | null
  resetKey?: string
}

/**
 * Evita la pantalla en blanco si una pantalla falla al dibujarse o al descargarse:
 * muestra qué pasó y cómo seguir.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isChunkLoadError(error) && reloadOnce()) return
    console.error('Error en la interfaz', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const chunk = isChunkLoadError(error)
    return (
      <div className="mx-auto max-w-xl py-10">
        <Alert
          action={
            <div className="flex flex-wrap gap-2">
              <Button icon={RefreshCw} onClick={() => window.location.reload()} size="sm">
                Recargar página
              </Button>
              {!chunk && (
                <Button icon={Home} onClick={() => window.location.assign('/dashboard')} size="sm" variant="secondary">
                  Ir al inicio
                </Button>
              )}
            </div>
          }
          title={chunk ? 'Hay una versión nueva del sistema' : 'Algo salió mal al mostrar esta pantalla'}
          tone="error"
        >
          {chunk
            ? 'Recarga la página para continuar. No se perdió ninguna información guardada.'
            : 'Recarga la página o vuelve al inicio. Si el problema continúa, avisa al administrador.'}
        </Alert>
      </div>
    )
  }
}
