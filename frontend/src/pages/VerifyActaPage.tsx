import { ArrowLeft, BadgeCheck, SearchCheck, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Feedback'
import { controlClass } from '../components/ui/Field'
import { institutionName } from '../lib/acta'
import { api, ApiError } from '../lib/api'
import { formatDate, formatDateTime } from '../lib/format'
import type { ActaVerification } from '../types/acta'

/** Normaliza lo escrito a XXXX-XXXX-XXXX-XXXX mientras se teclea. */
function formatCode(value: string): string {
  const clean = value.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 16)
  return clean.match(/.{1,4}/g)?.join('-') ?? ''
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium text-ink sm:text-right">{children}</dd>
    </div>
  )
}

function VerifyActaPage() {
  const [params, setParams] = useSearchParams()
  const [code, setCode] = useState(() => formatCode(params.get('codigo') ?? ''))
  const [result, setResult] = useState<ActaVerification | null>(null)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const autoChecked = useRef(false)

  async function verify(value: string) {
    if (value.replace(/-/g, '').length !== 16) {
      setError('El código tiene 16 caracteres: 4 grupos de 4 (por ejemplo 1A2B-3C4D-5E6F-7A8B).')
      setResult(null)
      return
    }
    setChecking(true)
    setError('')
    try {
      setResult(await api.verifyActa(value))
      setParams({ codigo: value }, { replace: true })
    } catch (caught) {
      setResult(null)
      setError(caught instanceof ApiError ? caught.message : 'No se pudo verificar el acta. Intenta nuevamente.')
    } finally {
      setChecking(false)
    }
  }

  // Si se abre desde el enlace impreso en el acta (?codigo=…), verifica automáticamente una vez.
  useEffect(() => {
    if (autoChecked.current || !code) return
    autoChecked.current = true
    void verify(code)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void verify(code)
  }

  return (
    <main className="flex min-h-screen flex-col bg-canvas">
      <div className="flex items-center justify-between p-4">
        <Link className="rounded-lg" to="/login">
          <Logo />
        </Link>
        <ThemeToggle />
      </div>
      <div className="flex flex-1 justify-center px-4 pt-4 pb-12 sm:pt-10">
        <div className="w-full max-w-lg space-y-5">
          <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                <SearchCheck aria-hidden="true" className="size-6" />
              </span>
              <div>
                <h1 className="text-xl font-semibold text-ink">Verificar un acta de resolución</h1>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Ingresa el código de verificación impreso al pie del acta para confirmar que fue emitida por{' '}
                  {institutionName()} y si sigue vigente. No se muestran datos personales.
                </p>
              </div>
            </div>

            <form className="mt-6 space-y-3" noValidate onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-ink-2" htmlFor="codigo">
                Código de verificación
              </label>
              <input
                aria-describedby={error ? 'codigo-error' : 'codigo-hint'}
                aria-invalid={error ? true : undefined}
                autoCapitalize="characters"
                autoComplete="off"
                className={`${controlClass} font-mono text-base tracking-widest uppercase`}
                id="codigo"
                inputMode="text"
                onChange={(event) => {
                  setCode(formatCode(event.target.value))
                  setError('')
                }}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                spellCheck={false}
                value={code}
              />
              {error ? (
                <p className="text-sm text-rose-700 dark:text-rose-400" id="codigo-error">
                  {error}
                </p>
              ) : (
                <p className="text-xs text-muted" id="codigo-hint">
                  16 caracteres (números y letras de la A a la F).
                </p>
              )}
              <Button className="w-full" icon={ShieldCheck} loading={checking} type="submit">
                Verificar
              </Button>
            </form>
          </section>

          {result && !result.valid && (
            <Alert title="No se pudo confirmar el acta" tone="error">
              {result.message} Revisa que el código esté bien escrito. Si el problema continúa, el documento podría no
              ser auténtico.
            </Alert>
          )}

          {result?.valid && (
            <section
              aria-live="polite"
              className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8"
            >
              <div className="flex items-start gap-3">
                {result.status === 'Vigente' ? (
                  <BadgeCheck aria-hidden="true" className="size-8 shrink-0 text-emerald-600" />
                ) : (
                  <ShieldAlert aria-hidden="true" className="size-8 shrink-0 text-amber-600" />
                )}
                <div>
                  <p className="text-lg font-semibold text-ink">
                    {result.status === 'Vigente' ? 'Acta auténtica y vigente' : 'Acta auténtica, pero reemplazada'}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {result.status === 'Vigente'
                      ? 'El documento fue emitido por EduResuelve y no ha sido reemplazado.'
                      : `Fue reemplazada el ${formatDateTime(result.replacedAt)}. ${result.replacedReason ?? ''}`}
                  </p>
                </div>
              </div>
              <dl className="mt-5 divide-y divide-line border-t border-line">
                <Row label="Número de acta">
                  <span className="font-mono">{result.number}</span>
                </Row>
                <Row label="Incidencia">{result.incidentCode}</Row>
                <Row label="Tipo">{result.kind}</Row>
                <Row label="Categoría">{result.category}</Row>
                <Row label="Emitida el">{formatDateTime(result.issuedAt)}</Row>
                <Row label="Fecha de resolución">{formatDate(result.resolutionDate, 'long')}</Row>
                <Row label="Cierre">{result.closedAt ? formatDateTime(result.closedAt) : 'Pendiente de validación'}</Row>
                {result.currentNumber && (
                  <Row label="Acta vigente actual">
                    <span className="font-mono">{result.currentNumber}</span>
                  </Row>
                )}
                <Row label="Huella del contenido">
                  <span className="font-mono text-xs">{result.hashPrefix}…</span>
                </Row>
              </dl>
              <p className="mt-4 text-xs leading-5 text-muted">
                Compara estos datos con los del documento impreso. Si alguno no coincide, el documento fue alterado.
              </p>
            </section>
          )}

          <Link className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400" to="/login">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    </main>
  )
}

export default VerifyActaPage
