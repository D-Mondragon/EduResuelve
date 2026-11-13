import {
  Copy,
  KeyRound,
  Lock,
  PencilLine,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  SearchX,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react'
import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { useCurrentUser } from '../auth/authContext'
import { useToast } from '../components/toast/toastContext'
import { RoleBadge, UserStatusBadge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Alert, EmptyState, ErrorState, LoadingState, PageHeader, StatCard } from '../components/ui/Feedback'
import { controlClass, Field, Input, Select } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { useAsync } from '../hooks/useAsync'
import { api, ApiError } from '../lib/api'
import { formatDate, formatDateTime, pluralize } from '../lib/format'
import { cn } from '../lib/ui'
import {
  generateTemporaryPassword,
  initials,
  isValidDni,
  isValidEmail,
  isValidPassword,
} from '../lib/validation'
import { userRoles, type ManagedUser, type UserFormData, type UserRole } from '../types/user'

type Dialog =
  | { kind: 'form'; user: ManagedUser | null }
  | { kind: 'status'; user: ManagedUser }
  | { kind: 'reset'; user: ManagedUser }
  | null

function PasswordField({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: string }) {
  const { notify } = useToast()
  return (
    <Field
      addon={
        <>
          <Button aria-label="Generar contraseña" icon={RefreshCw} onClick={() => onChange(generateTemporaryPassword())} variant="secondary" />
          <Button
            aria-label="Copiar contraseña"
            icon={Copy}
            onClick={() => {
              void navigator.clipboard?.writeText(value)
              notify('Contraseña copiada.', 'info')
            }}
            variant="secondary"
          />
        </>
      }
      error={error}
      hint="Mínimo 8 caracteres con letras y números. El usuario deberá cambiarla al ingresar."
      id="temp-password"
      label="Contraseña temporal"
      required
    >
      <Input className="font-mono" onChange={(e) => onChange(e.target.value)} value={value} />
    </Field>
  )
}

function UserFormModal({ user, onClose, onSaved }: { user: ManagedUser | null; onClose: () => void; onSaved: () => void }) {
  const { notify } = useToast()
  const editing = user !== null
  const [values, setValues] = useState<UserFormData>(() =>
    user
      ? { dni: user.dni, nombres: user.nombres, apellidos: user.apellidos, email: user.email, role: user.role }
      : { dni: '', nombres: '', apellidos: '', email: '', role: 'Estudiante', password: generateTemporaryPassword() },
  )
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  function update<K extends keyof UserFormData>(key: K, value: UserFormData[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: typeof errors = {}
    if (!isValidDni(values.dni)) next.dni = 'El DNI debe tener 8 dígitos.'
    if (!values.nombres.trim()) next.nombres = 'Ingresa los nombres.'
    if (!values.apellidos.trim()) next.apellidos = 'Ingresa los apellidos.'
    if (!isValidEmail(values.email)) next.email = 'Ingresa un correo válido.'
    if (!editing && !isValidPassword(values.password ?? '')) next.password = 'La contraseña no cumple los requisitos.'
    setErrors(next)
    setFormError('')
    if (Object.keys(next).length > 0) return

    setSaving(true)
    try {
      if (user) {
        await api.updateUser(user.id, values)
        notify('Usuario actualizado.')
      } else {
        await api.createUser(values)
        notify(`Usuario creado. Comparte la contraseña temporal con ${values.nombres}.`)
      }
      onSaved()
      onClose()
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : 'No se pudo guardar el usuario.')
    } finally {
      setSaving(false)
    }
  }

  const roleChangeWarning =
    user && values.role !== user.role && values.role === 'Estudiante' && user.activeAssignments > 0
      ? `Tiene ${pluralize(user.activeAssignments, 'incidencia activa asignada', 'incidencias activas asignadas')}: quedarán pendientes de reasignación.`
      : ''

  return (
    <Modal
      description={editing ? `${user.code} · los cambios quedan registrados en la auditoría.` : 'El usuario ingresará con su DNI.'}
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancelar
          </Button>
          <Button form="user-form" icon={editing ? PencilLine : UserPlus} loading={saving} type="submit">
            {editing ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </>
      }
      onClose={onClose}
      open
      size="lg"
      title={editing ? 'Editar usuario' : 'Nuevo usuario'}
    >
      <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" id="user-form" noValidate onSubmit={handleSubmit}>
        <Field error={errors.dni} id="user-dni" label="DNI" required>
          <Input
            data-autofocus
            inputMode="numeric"
            maxLength={8}
            onChange={(e) => update('dni', e.target.value.replace(/\D/g, '').slice(0, 8))}
            value={values.dni}
          />
        </Field>
        <Field error={errors.role} id="user-role" label="Rol" required>
          <Select onChange={(e) => update('role', e.target.value as UserRole)} value={values.role}>
            {userRoles.map((role) => (
              <option key={role}>{role}</option>
            ))}
          </Select>
        </Field>
        <Field error={errors.nombres} id="user-nombres" label="Nombres" required>
          <Input autoComplete="off" maxLength={80} onChange={(e) => update('nombres', e.target.value)} value={values.nombres} />
        </Field>
        <Field error={errors.apellidos} id="user-apellidos" label="Apellidos" required>
          <Input autoComplete="off" maxLength={80} onChange={(e) => update('apellidos', e.target.value)} value={values.apellidos} />
        </Field>
        <Field className="sm:col-span-2" error={errors.email} id="user-email" label="Correo electrónico" required>
          <Input autoComplete="off" onChange={(e) => update('email', e.target.value)} type="email" value={values.email} />
        </Field>
        {!editing && (
          <div className="sm:col-span-2">
            <PasswordField error={errors.password} onChange={(value) => update('password', value)} value={values.password ?? ''} />
          </div>
        )}
        {roleChangeWarning && (
          <Alert className="sm:col-span-2" tone="warning">
            {roleChangeWarning}
          </Alert>
        )}
        {formError && (
          <Alert className="sm:col-span-2" tone="error">
            {formError}
          </Alert>
        )}
      </form>
    </Modal>
  )
}

function StatusModal({ user, onClose, onSaved }: { user: ManagedUser; onClose: () => void; onSaved: () => void }) {
  const { notify } = useToast()
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const deactivating = user.status === 'Activo'

  async function confirm() {
    setSaving(true)
    try {
      const result = await api.setUserStatus(user.id, deactivating ? 'Inactivo' : 'Activo')
      notify(
        deactivating
          ? result.pendingReassignments > 0
            ? `Usuario desactivado. ${pluralize(result.pendingReassignments, 'incidencia quedó', 'incidencias quedaron')} pendiente de reasignación.`
            : 'Usuario desactivado.'
          : 'Usuario activado.',
      )
      onSaved()
      onClose()
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : 'No se pudo cambiar el estado.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancelar
          </Button>
          <Button icon={deactivating ? PowerOff : Power} loading={saving} onClick={() => void confirm()} variant={deactivating ? 'danger' : 'primary'}>
            {deactivating ? 'Desactivar' : 'Activar'}
          </Button>
        </>
      }
      onClose={onClose}
      open
      title={`${deactivating ? 'Desactivar' : 'Activar'} a ${user.fullName}`}
    >
      <div className="space-y-3 text-sm leading-6 text-ink-2">
        {deactivating ? (
          <>
            <p>El usuario no podrá iniciar sesión y sus sesiones abiertas se cerrarán. Su historial se conserva.</p>
            {user.activeAssignments > 0 && (
              <Alert tone="warning" title="Tiene incidencias asignadas">
                {pluralize(user.activeAssignments, 'incidencia activa quedará', 'incidencias activas quedarán')} marcada
                como “pendiente de reasignación” y se notificará a Orientadores y Administradores.
              </Alert>
            )}
          </>
        ) : (
          <p>El usuario podrá volver a iniciar sesión con su contraseña actual.</p>
        )}
        {formError && <Alert tone="error">{formError}</Alert>}
      </div>
    </Modal>
  )
}

function ResetPasswordModal({ user, onClose, onSaved }: { user: ManagedUser; onClose: () => void; onSaved: () => void }) {
  const { notify } = useToast()
  const [password, setPassword] = useState(generateTemporaryPassword)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  async function confirm() {
    if (!isValidPassword(password)) {
      setError('La contraseña no cumple los requisitos.')
      return
    }
    setSaving(true)
    try {
      await api.resetPassword(user.id, password)
      setDone(true)
      notify('Contraseña restablecida.')
      onSaved()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo restablecer la contraseña.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      description={`${user.fullName} · DNI ${user.dni}`}
      footer={
        done ? (
          <Button onClick={onClose}>Listo</Button>
        ) : (
          <>
            <Button onClick={onClose} variant="secondary">
              Cancelar
            </Button>
            <Button icon={KeyRound} loading={saving} onClick={() => void confirm()}>
              Restablecer
            </Button>
          </>
        )
      }
      onClose={onClose}
      open
      title="Restablecer contraseña"
    >
      {done ? (
        <Alert title="Contraseña restablecida" tone="success">
          Comparte esta contraseña temporal de forma segura:{' '}
          <code className="rounded bg-surface px-1.5 py-0.5 font-mono font-semibold">{password}</code>. El usuario deberá
          cambiarla al ingresar y su cuenta quedó desbloqueada.
        </Alert>
      ) : (
        <div className="space-y-3">
          <PasswordField error={error} onChange={(value) => {
            setPassword(value)
            setError('')
          }} value={password} />
          <p className="text-sm text-muted">Se cerrarán las sesiones abiertas del usuario.</p>
        </div>
      )}
    </Modal>
  )
}

function UserActions({ user, isSelf, onAction }: { user: ManagedUser; isSelf: boolean; onAction: (dialog: Dialog) => void }) {
  return (
    <div className="flex flex-wrap gap-1 lg:flex-nowrap">
      <Button aria-label={`Editar a ${user.fullName}`} icon={PencilLine} onClick={() => onAction({ kind: 'form', user })} size="sm" variant="ghost">
        Editar
      </Button>
      <Button
        aria-label={`Restablecer clave de ${user.fullName}`}
        icon={KeyRound}
        onClick={() => onAction({ kind: 'reset', user })}
        size="sm"
        variant="ghost"
      >
        Clave
      </Button>
      {!isSelf && (
        <Button
          aria-label={`${user.status === 'Activo' ? 'Desactivar' : 'Activar'} a ${user.fullName}`}
          className={user.status === 'Activo' ? 'text-rose-700 dark:text-rose-400' : undefined}
          icon={user.status === 'Activo' ? PowerOff : Power}
          onClick={() => onAction({ kind: 'status', user })}
          size="sm"
          variant="ghost"
        >
          {user.status === 'Activo' ? 'Desactivar' : 'Activar'}
        </Button>
      )}
    </div>
  )
}

function UsersPage() {
  const me = useCurrentUser()
  const load = useCallback(() => api.listUsers(), [])
  const { data, error, loading, reload } = useAsync(load)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<UserRole | ''>('')
  const [status, setStatus] = useState<'Activo' | 'Inactivo' | ''>('')
  const [dialog, setDialog] = useState<Dialog>(null)

  const users = useMemo(() => data ?? [], [data])
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es')
    return users.filter(
      (user) =>
        (!term || [user.fullName, user.email, user.dni].some((v) => v.toLocaleLowerCase('es').includes(term))) &&
        (!role || user.role === role) &&
        (!status || user.status === status),
    )
  }, [users, search, role, status])

  const closeDialog = useCallback(() => setDialog(null), [])
  const refresh = useCallback(() => reload(true), [reload])

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button icon={UserPlus} onClick={() => setDialog({ kind: 'form', user: null })}>
            Nuevo usuario
          </Button>
        }
        description="Crea cuentas, asigna roles y controla el acceso."
        icon={Users}
        title="Usuarios"
      />

      {loading && !data ? (
        <LoadingState />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={() => reload()} />
      ) : (
        <>
          <section aria-label="Resumen de usuarios" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={Users} label="Total" value={users.length} />
            <StatCard
              icon={UserCheck}
              label="Activos"
              tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
              value={users.filter((u) => u.status === 'Activo').length}
            />
            <StatCard
              icon={UserX}
              label="Inactivos"
              tone="bg-slate-100 text-slate-700 dark:bg-slate-400/10 dark:text-slate-300"
              value={users.filter((u) => u.status === 'Inactivo').length}
            />
            <StatCard
              icon={ShieldCheck}
              label="Administradores"
              tone="bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
              value={users.filter((u) => u.role === 'Administrador').length}
            />
          </section>

          <section
            aria-label="Buscar y filtrar usuarios"
            className="grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(14rem,1.6fr)_repeat(2,minmax(9rem,1fr))]"
          >
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="user-search">
                Buscar
              </label>
              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                <input
                  className={cn(controlClass, 'pl-9')}
                  id="user-search"
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nombre, correo o DNI…"
                  type="search"
                  value={search}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="user-role-filter">
                Rol
              </label>
              <select className={controlClass} id="user-role-filter" onChange={(e) => setRole(e.target.value as UserRole | '')} value={role}>
                <option value="">Todos</option>
                {userRoles.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted" htmlFor="user-status-filter">
                Estado
              </label>
              <select
                className={controlClass}
                id="user-status-filter"
                onChange={(e) => setStatus(e.target.value as 'Activo' | 'Inactivo' | '')}
                value={status}
              >
                <option value="">Todos</option>
                <option>Activo</option>
                <option>Inactivo</option>
              </select>
            </div>
          </section>

          <p aria-live="polite" className="text-sm font-medium text-muted">
            {pluralize(filtered.length, 'usuario', 'usuarios')}
          </p>

          {filtered.length === 0 ? (
            <EmptyState description="Prueba con otros filtros." icon={SearchX} title="No se encontraron usuarios" />
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-xl border border-line bg-surface shadow-sm lg:block">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Usuarios registrados</caption>
                  <thead className="bg-surface-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-5 py-3" scope="col">Usuario</th>
                      <th className="px-4 py-3" scope="col">DNI</th>
                      <th className="px-4 py-3" scope="col">Rol</th>
                      <th className="px-4 py-3" scope="col">Estado</th>
                      <th className="px-4 py-3" scope="col">Último ingreso</th>
                      <th className="px-4 py-3" scope="col">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((user) => (
                      <tr className="hover:bg-surface-2" key={user.id}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-ink-2">
                              {initials(user.fullName)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-ink">
                                {user.fullName}
                                {user.id === me.id && <span className="ml-1 text-xs font-normal text-muted">(tú)</span>}
                              </p>
                              <p className="truncate text-xs text-muted">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-ink-2">{user.dni}</td>
                        <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1">
                            <UserStatusBadge status={user.status} />
                            {user.isLocked && (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                                <Lock aria-hidden="true" className="size-3" /> Bloqueado
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted">
                          {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Nunca'}
                        </td>
                        <td className="px-4 py-2">
                          <UserActions isSelf={user.id === me.id} onAction={setDialog} user={user} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
                {filtered.map((user) => (
                  <li className="rounded-xl border border-line bg-surface p-4 shadow-sm" key={user.id}>
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-ink-2">
                        {initials(user.fullName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink">
                          {user.fullName}
                          {user.id === me.id && <span className="ml-1 text-xs font-normal text-muted">(tú)</span>}
                        </p>
                        <p className="truncate text-sm text-muted">{user.email}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <RoleBadge role={user.role} />
                          <UserStatusBadge status={user.status} />
                        </div>
                      </div>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 text-xs">
                      <div>
                        <dt className="text-muted">DNI</dt>
                        <dd className="font-mono text-ink-2">{user.dni}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Registro</dt>
                        <dd className="text-ink-2">{formatDate(user.createdAt)}</dd>
                      </div>
                    </dl>
                    <div className="mt-3 border-t border-line pt-2">
                      <UserActions isSelf={user.id === me.id} onAction={setDialog} user={user} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      {dialog?.kind === 'form' && <UserFormModal onClose={closeDialog} onSaved={refresh} user={dialog.user} />}
      {dialog?.kind === 'status' && <StatusModal onClose={closeDialog} onSaved={refresh} user={dialog.user} />}
      {dialog?.kind === 'reset' && <ResetPasswordModal onClose={closeDialog} onSaved={refresh} user={dialog.user} />}
    </div>
  )
}

export default UsersPage
