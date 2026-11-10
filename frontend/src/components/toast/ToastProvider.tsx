import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { cn } from '../../lib/ui'
import { ToastContext, type ToastTone } from './toastContext'

interface Toast {
  id: number
  message: string
  tone: ToastTone
}

const icons = { success: CheckCircle2, error: XCircle, info: Info }
const styles: Record<ToastTone, string> = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-rose-600 dark:text-rose-400',
  info: 'text-blue-600 dark:text-blue-400',
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = nextId++
      setToasts((current) => [...current.slice(-3), { id, message, tone }])
      setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4500)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end print:hidden"
      >
        {toasts.map((toast) => {
          const Icon = icons[toast.tone]
          return (
            <div
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink shadow-lg"
              key={toast.id}
              role={toast.tone === 'error' ? 'alert' : 'status'}
            >
              <Icon aria-hidden="true" className={cn('mt-0.5 size-5 shrink-0', styles[toast.tone])} />
              <p className="min-w-0 flex-1 leading-6">{toast.message}</p>
              <button
                aria-label="Cerrar notificación"
                className="rounded p-0.5 text-muted hover:text-ink"
                onClick={() => dismiss(toast.id)}
                type="button"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
