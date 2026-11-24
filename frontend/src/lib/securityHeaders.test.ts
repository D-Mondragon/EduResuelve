import { describe, expect, it } from 'vitest'
import vercel from '../../vercel.json'

const headers = Object.fromEntries(
  (vercel.headers.find((h) => h.source === '/(.*)')?.headers ?? []).map((h) => [h.key, h.value]),
)
const csp = Object.fromEntries(
  (headers['Content-Security-Policy'] ?? '').split(';').map((d) => {
    const [name, ...values] = d.trim().split(/\s+/)
    return [name, values]
  }),
)

describe('Cabeceras de seguridad de producción (vercel.json)', () => {
  it('CP-UI-52: la CSP solo permite scripts y estilos propios y conexiones a la API del sistema', () => {
    expect(csp['default-src']).toEqual(["'self'"])
    expect(csp['script-src']).toEqual(["'self'"]) // sin 'unsafe-inline' ni 'unsafe-eval'
    expect(csp['style-src']).toEqual(["'self'"])
    expect(csp['connect-src']).toEqual(["'self'", 'https://wppxrarbapuseglglptm.supabase.co'])
    expect(csp['object-src']).toEqual(["'none'"])
    expect(csp['frame-ancestors']).toEqual(["'none'"]) // nadie puede incrustar el sistema (clickjacking)
    expect(csp['frame-src']).toEqual(['blob:']) // solo el visor de PDF de las evidencias
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
  })
})
