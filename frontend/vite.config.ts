import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { defineConfig, loadEnv } from 'vite'

const PRODUCTION_API = 'https://wppxrarbapuseglglptm.supabase.co'

/**
 * Cabeceras de seguridad de producción (vercel.json) para `vite preview`, así las pruebas E2E
 * sobre el build (E2E_PROD=1) usan la misma política CSP que el sitio publicado.
 * Solo se adapta el origen de la API (local en las pruebas) y se omite el paso a https.
 */
function productionHeaders(apiUrl: string | undefined): Record<string, string> {
  const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf-8')) as {
    headers: { source: string; headers: { key: string; value: string }[] }[]
  }
  const all = vercel.headers.find((h) => h.source === '/(.*)')?.headers ?? []
  const headers = Object.fromEntries(all.map((h) => [h.key, h.value]))
  const csp = headers['Content-Security-Policy']
  if (csp && apiUrl) {
    headers['Content-Security-Policy'] = csp
      .replace(PRODUCTION_API, new URL(apiUrl).origin)
      .replace(/;\s*upgrade-insecure-requests/, '')
  }
  return headers
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
  return {
    plugins: [react(), tailwindcss()],
    preview: { headers: productionHeaders(env.VITE_SUPABASE_URL) },
  }
})
