import { useCallback, useSyncExternalStore } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'eduresuelve.theme'
const listeners = new Set<() => void>()

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // sin almacenamiento disponible
  }
  return 'system'
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

export function applyTheme(preference: ThemePreference = readPreference()) {
  const dark = preference === 'dark' || (preference === 'system' && systemPrefersDark())
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const media = window.matchMedia?.('(prefers-color-scheme: dark)')
  const onChange = () => {
    applyTheme()
    listener()
  }
  media?.addEventListener('change', onChange)
  return () => {
    listeners.delete(listener)
    media?.removeEventListener('change', onChange)
  }
}

export function useTheme() {
  const preference = useSyncExternalStore(subscribe, readPreference, () => 'system' as ThemePreference)

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // sin almacenamiento disponible
    }
    applyTheme(next)
    listeners.forEach((listener) => listener())
  }, [])

  const isDark = preference === 'dark' || (preference === 'system' && systemPrefersDark())
  return { preference, isDark, setPreference }
}
