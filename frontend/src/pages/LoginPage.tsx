import { useState, type FormEvent } from 'react'

function LoginPage() {
  const [status, setStatus] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('El acceso institucional estará disponible próximamente.')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10">
        <header className="mb-8">
          <p className="text-sm font-semibold text-emerald-800">EduResuelve</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Iniciar sesión
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Plataforma de gestión, seguimiento y resolución de incidencias
            educativas
          </p>
        </header>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="email"
            >
              Correo electrónico
            </label>
            <input
              className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 shadow-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              autoComplete="email"
              id="email"
              name="email"
              required
              type="email"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-slate-700"
              htmlFor="password"
            >
              Contraseña
            </label>
            <input
              className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 shadow-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
              autoComplete="current-password"
              id="password"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </div>

          <button
            className="w-full rounded-md bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            type="submit"
          >
            Iniciar sesión
          </button>

          {status && (
            <p className="text-sm leading-6 text-slate-600" role="status">
              {status}
            </p>
          )}
        </form>

        <p className="mt-8 border-t border-slate-100 pt-5 text-center text-xs text-slate-500">
          Acceso institucional a EduResuelve
        </p>
      </section>
    </main>
  )
}

export default LoginPage