import { useEffect, useRef, useState } from 'react'
import { mockUsers } from '../data/mockUsers'
import type { User, UserRole, UserStatus } from '../types/user'

type RoleFilter = 'Todos' | UserRole
type StatusFilter = 'Todos' | UserStatus

const roles: UserRole[] = [
  'Estudiante',
  'Docente',
  'Responsable de convivencia',
  'Orientador',
  'Administrador',
]

const statuses: UserStatus[] = ['Activo', 'Inactivo']

const dateFormatter = new Intl.DateTimeFormat('es', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        status === 'Activo'
          ? 'bg-emerald-50 text-emerald-800'
          : 'bg-slate-100 text-slate-600'
      }`}
    >
      {status}
    </span>
  )
}

function UserDetails({ user }: { user: User }) {
  return (
    <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      <div>
        <dt className="text-xs font-medium text-slate-500">Nombres</dt>
        <dd className="mt-1 text-sm text-slate-800">{user.nombres}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium text-slate-500">Apellidos</dt>
        <dd className="mt-1 text-sm text-slate-800">{user.apellidos}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium text-slate-500">Correo</dt>
        <dd className="mt-1 break-all text-sm text-slate-800">{user.email}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium text-slate-500">Rol</dt>
        <dd className="mt-1 text-sm text-slate-800">{user.role}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium text-slate-500">Estado</dt>
        <dd className="mt-1"><UserStatusBadge status={user.status} /></dd>
      </div>
      <div>
        <dt className="text-xs font-medium text-slate-500">Fecha de registro</dt>
        <dd className="mt-1 text-sm text-slate-800">
          <time dateTime={user.createdAt}>
            {dateFormatter.format(new Date(user.createdAt))}
          </time>
        </dd>
      </div>
    </dl>
  )
}

function UsersPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('Todos')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todos')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [registrationMessage, setRegistrationMessage] = useState('')
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!selectedUser) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedUser(null)
    }

    document.addEventListener('keydown', handleKeyDown)
    closeButtonRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedUser])

  const normalizedSearch = search.trim().toLocaleLowerCase('es')
  const filteredUsers = mockUsers.filter((user) => {
    const fullName = `${user.nombres} ${user.apellidos}`.toLocaleLowerCase('es')
    const matchesSearch =
      normalizedSearch.length === 0 ||
      fullName.includes(normalizedSearch) ||
      user.email.toLocaleLowerCase('es').includes(normalizedSearch)
    const matchesRole = roleFilter === 'Todos' || user.role === roleFilter
    const matchesStatus = statusFilter === 'Todos' || user.status === statusFilter

    return matchesSearch && matchesRole && matchesStatus
  })

  const summaryCards = [
    { label: 'Total de usuarios', count: mockUsers.length },
    {
      label: 'Usuarios activos',
      count: mockUsers.filter((user) => user.status === 'Activo').length,
    },
    {
      label: 'Usuarios inactivos',
      count: mockUsers.filter((user) => user.status === 'Inactivo').length,
    },
    {
      label: 'Administradores',
      count: mockUsers.filter((user) => user.role === 'Administrador').length,
    },
  ]

  function showRegistrationMessage() {
    setRegistrationMessage(
      'El registro de usuarios estará disponible en una próxima etapa.',
    )
  }

  return (
    <section className="mx-auto w-full max-w-7xl space-y-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Usuarios
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
            Gestión de usuarios y roles
          </p>
        </div>
        <button
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          onClick={showRegistrationMessage}
          type="button"
        >
          <span aria-hidden="true" className="mr-2 text-lg leading-none">+</span>
          Nuevo usuario
        </button>
      </header>

      {registrationMessage && (
        <p
          aria-live="polite"
          className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900"
          role="status"
        >
          {registrationMessage}
        </p>
      )}

      <section aria-label="Resumen de usuarios">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {summaryCards.map((card) => (
            <li
              className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              key={card.label}
            >
              <p className="text-xs font-medium leading-5 text-slate-600 sm:text-sm">
                {card.label}
              </p>
              <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900">
                {card.count}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-label="Buscar y filtrar usuarios"
        className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1fr)_minmax(13rem,0.7fr)_minmax(11rem,0.5fr)] sm:p-5"
      >
        <div>
          <label
            className="mb-1.5 block text-xs font-medium text-slate-600"
            htmlFor="user-search"
          >
            Buscar usuario
          </label>
          <input
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            id="user-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre, apellido o correo..."
            type="search"
            value={search}
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-xs font-medium text-slate-600"
            htmlFor="user-role"
          >
            Rol
          </label>
          <select
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            id="user-role"
            onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
            value={roleFilter}
          >
            <option value="Todos">Todos</option>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="mb-1.5 block text-xs font-medium text-slate-600"
            htmlFor="user-status"
          >
            Estado
          </label>
          <select
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            id="user-status"
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
            value={statusFilter}
          >
            <option value="Todos">Todos</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <p aria-live="polite" className="text-sm font-medium text-slate-600">
          {filteredUsers.length} {filteredUsers.length === 1 ? 'usuario' : 'usuarios'}
        </p>
      </div>

      {filteredUsers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm text-slate-600">
          No se encontraron usuarios.
        </p>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <caption className="sr-only">Usuarios registrados</caption>
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
                  <tr>
                    <th className="px-5 py-3.5" scope="col">Usuario</th>
                    <th className="px-5 py-3.5" scope="col">Correo</th>
                    <th className="px-5 py-3.5" scope="col">Rol</th>
                    <th className="px-5 py-3.5" scope="col">Estado</th>
                    <th className="px-5 py-3.5" scope="col">Fecha de registro</th>
                    <th className="px-5 py-3.5" scope="col">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr className="hover:bg-slate-50/70" key={user.id}>
                      <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900">
                        {user.nombres} {user.apellidos}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {user.email}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                        {user.role}
                      </td>
                      <td className="px-5 py-4">
                        <UserStatusBadge status={user.status} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        <time dateTime={user.createdAt}>
                          {dateFormatter.format(new Date(user.createdAt))}
                        </time>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          className="rounded px-2 py-1 font-medium text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                          onClick={() => setSelectedUser(user)}
                          type="button"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <ul aria-label="Usuarios encontrados" className="space-y-3 md:hidden">
            {filteredUsers.map((user) => (
              <li
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                key={user.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words text-sm font-semibold text-slate-900">
                      {user.nombres} {user.apellidos}
                    </h2>
                    <p className="mt-1 break-all text-sm text-slate-600">
                      {user.email}
                    </p>
                  </div>
                  <UserStatusBadge status={user.status} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                  <div>
                    <dt className="text-xs text-slate-500">Rol</dt>
                    <dd className="mt-1 text-sm leading-5 text-slate-800">
                      {user.role}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Registro</dt>
                    <dd className="mt-1 text-sm text-slate-800">
                      {dateFormatter.format(new Date(user.createdAt))}
                    </dd>
                  </div>
                </dl>
                <button
                  className="mt-4 rounded px-2 py-1 text-sm font-medium text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                  onClick={() => setSelectedUser(user)}
                  type="button"
                >
                  Ver
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Cerrar detalle del usuario"
            className="absolute inset-0 cursor-default bg-slate-950/40"
            onClick={() => setSelectedUser(null)}
            type="button"
          />
          <section
            aria-labelledby="user-details-title"
            aria-modal="true"
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-xl sm:p-6"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  className="text-lg font-semibold text-slate-900"
                  id="user-details-title"
                >
                  Detalle de usuario
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedUser.nombres} {selectedUser.apellidos}
                </p>
              </div>
              <button
                aria-label="Cerrar detalle del usuario"
                className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                onClick={() => setSelectedUser(null)}
                ref={closeButtonRef}
                type="button"
              >
                Cerrar
              </button>
            </div>
            <UserDetails user={selectedUser} />
          </section>
        </div>
      )}
    </section>
  )
}

export default UsersPage