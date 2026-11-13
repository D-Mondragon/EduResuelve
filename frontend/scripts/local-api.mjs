// Emulador local de la API RPC de Supabase (PostgREST) sobre PGlite.
// Permite desarrollar y probar sin conexión a Supabase.
//   npm run api:local          → inicia en http://localhost:54321
//   npm run api:local -- --reset → borra la base local y vuelve a sembrar
import { rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { callRpc, createDatabase, readSql } from './pglite-db.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(here, '../.local-db')
const port = Number(process.env.LOCAL_API_PORT ?? 54321)
const inMemory = process.argv.includes('--memory')

if (process.argv.includes('--reset') && !inMemory) {
  rmSync(dataDir, { recursive: true, force: true })
  console.log('Base local eliminada; se volverá a crear con los datos demo.')
}

const db = await createDatabase(inMemory ? {} : { dataDir })

// --demo: agrega las 40 incidencias simuladas de 04_demo_ampliado.sql (idempotente)
if (process.argv.includes('--demo')) {
  await db.exec(readSql('04_demo_ampliado.sql'))
  console.log('Datos de demostración ampliados cargados (40 incidencias simuladas).')
}

function statusFor(code) {
  if (typeof code === 'string' && /^PT\d{3}$/.test(code)) return Number(code.slice(2))
  if (code === 'P0001' || /^2[23]/.test(code ?? '')) return 400
  if (code === 'PGRST202') return 404
  return 500
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Serializa las llamadas: PGlite es de una sola conexión
let queue = Promise.resolve()

const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' })
    res.end('{"ok":true}')
    return
  }
  const match = req.url?.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/)
  if (req.method !== 'POST' || !match) {
    res.writeHead(404, { ...corsHeaders, 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ code: 'PGRST202', message: 'Ruta no encontrada' }))
    return
  }

  let body = ''
  req.on('data', (chunk) => {
    body += chunk
  })
  req.on('end', () => {
    queue = queue.then(async () => {
      const started = Date.now()
      try {
        const args = body ? JSON.parse(body) : {}
        const result = await callRpc(db, match[1], args)
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' })
        res.end(JSON.stringify(result ?? null))
        console.log(`200 ${match[1]} ${Date.now() - started}ms`)
      } catch (error) {
        const status = statusFor(error.code)
        res.writeHead(status, { ...corsHeaders, 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ code: error.code ?? 'XX000', message: error.message, details: null, hint: null }))
        console.log(`${status} ${match[1]} ${error.code}: ${error.message}`)
      }
    })
  })
})

server.listen(port, () => {
  console.log(`API local de EduResuelve en http://localhost:${port} (${inMemory ? 'memoria' : dataDir})`)
  console.log('Usuarios demo: DNI 70000001 … 70000008 · contraseña EduResuelve2026')
})
