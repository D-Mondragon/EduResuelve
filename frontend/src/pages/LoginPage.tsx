import { ChevronDown, Eye, EyeOff, IdCard, LockKeyhole, LogIn } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/authContext'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Feedback'
import { controlClass } from '../components/ui/Field'
import { cn } from '../lib/ui'

const demoUsers = [
  { dni: '70000007', label: 'Administrador', name: 'Greta Demostración' },
  { dni: '70000005', label: 'Orientador', name: 'Estela Inventada' },
  { dni: '70000003', label: 'Docente', name: 'Camila Ficticia' },
  { dni: '70000001', label: 'Estudiante', name: 'Alicia Ejemplo' },
]

const showDemo = import.meta.env.VITE_SHOW_DEMO_USERS !== 'false'

function LoginPage() {
  const { login, sessionMessage } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [dni, setDni] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ dni?: string; password?: string }>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: typeof errors = {}
    if (!/^\d{8}$/.test(dni)) nextErrors.dni = 'El DNI debe tener 8 dígitos.'
    if (!password) nextErrors.password = 'Ingresa tu contraseña.'
    setErrors(nextErrors)
    setFormError('')
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    const error = await login(dni, password)
    setSubmitting(false)
    if (error) {
      setFormError(error)
      setPassword('')
      return
    }
    const from = (location.state as { from?: string } | null)?.from
    navigate(from && from !== '/login' ? from : '/dashboard', { replace: true })
  }

  return (
    <main className="flex min-h-screen flex-col bg-canvas">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo className="[&>span]:text-2xl [&>svg]:size-11" />
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted">
              Gestión, seguimiento y resolución de incidencias educativas
            </p>
          </div>

          <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
            <h1 className="text-xl font-semibold text-ink">Iniciar sesión</h1>
            <p className="mt-1 text-sm text-muted">Ingresa con tu DNI y contraseña.</p>

            {sessionMessage && !formError && (
              <Alert className="mt-5" tone="warning">
                {sessionMessage}
              </Alert>
            )}
            {formError && (
              <Alert className="mt-5" tone="error">
                {formError}
              </Alert>
            )}

            <form className="mt-6 space-y-5" noValidate onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-ink-2" htmlFor="dni">
                  DNI
                </label>
                <div className="relative mt-1.5">
                  <IdCard aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" />
                  <input
                    aria-describedby={errors.dni ? 'dni-error' : undefined}
                    aria-invalid={errors.dni ? true : undefined}
                    autoComplete="username"
                    autoFocus
                    className={cn(controlClass, 'pl-10 tracking-wider')}
                    id="dni"
                    inputMode="numeric"
                    onChange={(event) => {
                      setDni(event.target.value.replace(/\D/g, '').slice(0, 8))
                      setErrors((current) => ({ ...current, dni: undefined }))
                    }}
                    placeholder="12345678"
                    value={dni}
                  />
                </div>
                {errors.dni && (
                  <p className="mt-1.5 text-sm text-rose-700 dark:text-rose-400" id="dni-error">
                    {errors.dni}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-2" htmlFor="password">
                  Contraseña
                </label>
                <div className="relative mt-1.5">
                  <LockKeyhole aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" />
                  <input
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    aria-invalid={errors.password ? true : undefined}
                    autoComplete="current-password"
                    className={cn(controlClass, 'px-10')}
                    id="password"
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setErrors((current) => ({ ...current, password: undefined }))
                    }}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                  <button
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showPassword}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1.5 text-muted hover:text-ink"
                    onClick={() => setShowPassword((value) => !value)}
                    type="button"
                  >
                    {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-sm text-rose-700 dark:text-rose-400" id="password-error">
                    {errors.password}
                  </p>
                )}
              </div>

              <Button className="w-full" icon={LogIn} loading={submitting} type="submit">
                {submitting ? 'Ingresando…' : 'Ingresar'}
              </Button>
            </form>

            <p className="mt-5 text-center text-xs leading-5 text-muted">
              ¿Olvidaste tu contraseña? Solicita al administrador que la restablezca.
            </p>
          </section>

          {showDemo && (
            <details className="group mt-4 rounded-xl border border-line bg-surface px-4 py-3 text-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-ink-2">
                Usuarios de demostración
                <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-xs text-muted">
                Contraseña: <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-ink">EduResuelve2026</code>
              </p>
              <ul className="mt-2 grid gap-1.5">
                {demoUsers.map((demo) => (
                  <li key={demo.dni}>
                    <button
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-surface-2"
                      onClick={() => {
                        setDni(demo.dni)
                        setPassword('EduResuelve2026')
                        setErrors({})
                        setFormError('')
                      }}
                      type="button"
                    >
                      <span>
                        <span className="font-medium text-ink">{demo.label}</span>
                        <span className="text-muted"> · {demo.name}</span>
                      </span>
                      <span className="font-mono text-xs text-muted">{demo.dni}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </main>
  )
}

export default LoginPage
