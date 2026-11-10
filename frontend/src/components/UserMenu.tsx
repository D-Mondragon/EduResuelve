import { ChevronDown, KeyRound, LogOut } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth, useCurrentUser } from '../auth/authContext'
import { useDismiss } from '../hooks/useDismiss'
import { initials } from '../lib/validation'
import { ThemeToggle } from './ThemeToggle'

export function UserMenu() {
  const user = useCurrentUser()
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false))

  return (
    <div className="relative" ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-emerald-600"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
          {initials(user.fullName)}
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-40 truncate text-sm font-medium text-ink">{user.fullName}</span>
          <span className="block text-xs text-muted">{user.role}</span>
        </span>
        <ChevronDown aria-hidden="true" className="size-4 text-muted" />
      </button>

      {open && (
        <div className="absolute top-full right-0 z-40 mt-2 w-72 rounded-xl border border-line bg-surface p-2 shadow-xl">
          <div className="border-b border-line px-3 pt-1 pb-3">
            <p className="truncate text-sm font-semibold text-ink">{user.fullName}</p>
            <p className="text-xs text-muted">
              {user.role} · DNI {user.dni}
            </p>
          </div>
          <div className="px-1 py-3">
            <p className="mb-2 px-2 text-xs font-medium text-muted">Tema</p>
            <ThemeToggle className="w-full" />
          </div>
          <div className="border-t border-line pt-2">
            <Link
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
              onClick={() => setOpen(false)}
              to="/cambiar-contrasena"
            >
              <KeyRound aria-hidden="true" className="size-4" />
              Cambiar contraseña
            </Link>
            <button
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-400/10"
              onClick={() => {
                setOpen(false)
                void logout()
              }}
              type="button"
            >
              <LogOut aria-hidden="true" className="size-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
