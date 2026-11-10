import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastContextValue {
  notify: (message: string, tone?: ToastTone) => void
}

export const ToastContext = createContext<ToastContextValue>({ notify: () => undefined })

export function useToast(): ToastContextValue {
  return useContext(ToastContext)
}
