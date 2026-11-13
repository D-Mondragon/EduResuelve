import {
  ChartColumnBig,
  ClipboardList,
  FilePlus2,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useCurrentUser } from '../auth/authContext'
import { Logo } from '../components/Logo'
import { NotificationBell } from '../components/NotificationBell'
import { UserMenu } from '../components/UserMenu'
import { canManageUsers, canViewAudit, canViewQuality } from '../lib/permissions'
import { cn } from '../lib/ui'
import type { User } from '../types/user'

interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
}

function navigationFor(user: User): NavItem[] {
  const items: NavItem[] = [
    { label: 'Inicio', to: '/dashboard', icon: LayoutDashboard },
    {
      label: user.role === 'Estudiante' ? 'Mis incidencias' : 'Incidencias',
      to: '/incidencias',
      icon: ClipboardList,
      end: true,
    },
    { label: 'Registrar incidencia', to: '/incidencias/nueva', icon: FilePlus2 },
  ]
  if (canViewQuality(user.role)) items.push({ label: 'Calidad', to: '/calidad', icon: ChartColumnBig })
  if (canManageUsers(user.role)) items.push({ label: 'Usuarios', to: '/usuarios', icon: Users })
  if (canViewAudit(user.role)) items.push({ label: 'Auditoría', to: '/auditoria', icon: ShieldCheck })
  return items
}

function Navigation({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <nav aria-label="Navegación principal" className="flex flex-col gap-1">
      {items.map(({ label, to, icon: Icon, end }) => (
        <NavLink
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600',
              isActive
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300'
                : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
            )
          }
          end={end}
          key={to}
          onClick={onNavigate}
          to={to}
        >
          <Icon aria-hidden="true" className="size-5 shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

function MainLayout() {
  const user = useCurrentUser()
  const items = navigationFor(user)
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [lastPath, setLastPath] = useState(location.pathname)

  // Cierra el menú móvil al cambiar de página
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setDrawerOpen(false)
  }

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setDrawerOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded-lg focus:bg-emerald-700 focus:px-4 focus:py-2 focus:text-white"
        href="#contenido"
      >
        Saltar al contenido
      </a>

      {/* Barra lateral (escritorio) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex print:hidden">
        <div className="flex h-16 items-center border-b border-line px-5">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <Navigation items={items} />
        </div>
        <p className="border-t border-line px-5 py-4 text-xs leading-5 text-muted">
          Sesión: <span className="font-medium text-ink-2">{user.role}</span>
        </p>
      </aside>

      {/* Menú lateral (móvil) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div aria-hidden="true" className="absolute inset-0 bg-slate-950/50" onClick={() => setDrawerOpen(false)} />
          <div
            aria-label="Menú"
            aria-modal="true"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-xl"
            role="dialog"
          >
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <Logo />
              <button
                aria-label="Cerrar menú"
                className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink"
                onClick={() => setDrawerOpen(false)}
                type="button"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <Navigation items={items} onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6 print:hidden">
          <div className="flex items-center gap-2">
            <button
              aria-label="Abrir menú"
              className="rounded-lg p-2 text-ink-2 hover:bg-surface-2 lg:hidden"
              onClick={() => setDrawerOpen(true)}
              type="button"
            >
              <Menu aria-hidden="true" className="size-5" />
            </button>
            <Logo className="lg:hidden" showText={false} />
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 print:max-w-none print:p-0" id="contenido" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
