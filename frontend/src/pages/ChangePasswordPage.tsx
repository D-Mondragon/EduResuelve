import { ArrowLeft, Check, KeyRound, LogOut, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAuth, useCurrentUser } from '../auth/authContext'
import { Logo } from '../components/Logo'
import { useToast } from '../components/toast/toastContext'
import { Button, ButtonLink } from '../components/ui/Button'
import { Alert } from '../components/ui/Feedback'
import { Field, Input } from '../components/ui/Field'
import { api, ApiError } from '../lib/api'
import { cn } from '../lib/ui'
import { passwordRules } from '../lib/validation'

function ChangePasswordPage() {
  const user = useCurrentUser()
  const { updateUser, logout } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const forced = user.mustChangePassword

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!current) nextErrors.current = 'Ingresa tu contraseña actual.'
    if (!passwordRules.every((rule) => rule.test(next))) nextErrors.next = 'La nueva contraseña no cumple los requisitos.'
    if (next !== confirm) nextErrors.confirm = 'Las contraseñas no coinciden.'
    setErrors(nextErrors)
    setFormError('')
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    try {
      const updated = await api.changePassword(current, next)
      updateUser(updated)
      notify('Tu contraseña se actualizó correctamente.')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'No se pudo cambiar la contraseña.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
              <KeyRound aria-hidden="true" className="size-5" />
            </span>
            <h1 className="text-xl font-semibold text-ink">Cambiar contraseña</h1>
          </div>
          {forced && (
            <Alert className="mt-5" tone="info">
              Por seguridad, debes cambiar la contraseña temporal antes de continuar.
            </Alert>
          )}
          {formError && (
            <Alert className="mt-5" tone="error">
              {formError}
            </Alert>
          )}

          <form className="mt-6 space-y-5" noValidate onSubmit={handleSubmit}>
            <Field error={errors.current} id="current-password" label="Contraseña actual" required>
              <Input autoComplete="current-password" onChange={(e) => setCurrent(e.target.value)} type="password" value={current} />
            </Field>
            <Field error={errors.next} id="new-password" label="Nueva contraseña" required>
              <Input autoComplete="new-password" onChange={(e) => setNext(e.target.value)} type="password" value={next} />
            </Field>
            <ul aria-label="Requisitos de la contraseña" className="-mt-2 space-y-1 text-sm">
              {passwordRules.map((rule) => {
                const ok = rule.test(next)
                return (
                  <li className={cn('flex items-center gap-2', ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted')} key={rule.label}>
                    {ok ? <Check aria-hidden="true" className="size-4" /> : <X aria-hidden="true" className="size-4" />}
                    {rule.label}
                    <span className="sr-only">{ok ? '(cumplido)' : '(pendiente)'}</span>
                  </li>
                )
              })}
            </ul>
            <Field error={errors.confirm} id="confirm-password" label="Confirmar nueva contraseña" required>
              <Input autoComplete="new-password" onChange={(e) => setConfirm(e.target.value)} type="password" value={confirm} />
            </Field>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between">
              {forced ? (
                <Button icon={LogOut} onClick={() => void logout()} variant="ghost">
                  Cerrar sesión
                </Button>
              ) : (
                <ButtonLink icon={ArrowLeft} to="/dashboard" variant="ghost">
                  Volver
                </ButtonLink>
              )}
              <Button icon={KeyRound} loading={saving} type="submit">
                Guardar contraseña
              </Button>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}

export default ChangePasswordPage
