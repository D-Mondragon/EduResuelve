// Inicia la API local (PGlite) y Vite apuntando a ella.
import { spawn } from 'node:child_process'

const api = spawn(process.execPath, ['scripts/local-api.mjs', ...process.argv.slice(2)], { stdio: 'inherit' })
const vite = spawn('npx vite', {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    VITE_SUPABASE_URL: 'http://localhost:54321',
    VITE_SUPABASE_ANON_KEY: 'local-dev-key',
  },
})

function stop() {
  api.kill()
  vite.kill()
  process.exit()
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
api.on('exit', stop)
vite.on('exit', stop)
