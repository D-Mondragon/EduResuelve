import { useEffect, useRef, type RefObject } from 'react'

/** Cierra un menú desplegable al hacer clic fuera o presionar Escape. */
export function useDismiss<T extends HTMLElement>(open: boolean, onDismiss: () => void): RefObject<T | null> {
  const ref = useRef<T>(null)
  const callback = useRef(onDismiss)

  useEffect(() => {
    callback.current = onDismiss
  })

  useEffect(() => {
    if (!open) return
    function handlePointer(event: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) callback.current()
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') callback.current()
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('touchstart', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('touchstart', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return ref
}
