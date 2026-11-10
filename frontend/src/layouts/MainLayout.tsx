import { NavLink, Outlet } from 'react-router'

type NavigationItem =
  | { label: string; to: string; pending?: false }
  | { label: string; pending: true }

const navigationItems: NavigationItem[] = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Incidencias', to: '/incidencias' },
  { label: 'Seguimiento', pending: true },
  { label: 'Evidencias', pending: true },
  { label: 'Usuarios', to: '/usuarios' },
  { label: 'Auditoría', to: '/auditoria' },
]

function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
        <span className="text-lg font-semibold tracking-tight">EduResuelve</span>
        <span className="text-sm text-slate-600">Usuario de prueba</span>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)] flex-col md:flex-row">
        <aside className="w-full border-b border-slate-200 bg-white md:w-60 md:shrink-0 md:border-r md:border-b-0">
          <nav
            aria-label="Navegación principal"
            className="flex gap-1 overflow-x-auto p-3 md:flex-col md:overflow-visible md:p-4"
          >
            {navigationItems.map((item) =>
              item.pending ? (
                <span
                  aria-disabled="true"
                  className="shrink-0 cursor-not-allowed rounded-md px-3 py-2 text-sm font-medium text-slate-400"
                  key={item.label}
                >
                  {item.label}
                </span>
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/dashboard'}
                  className={({ isActive }) =>
                    `shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ),
            )}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-6 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout