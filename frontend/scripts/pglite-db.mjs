// Crea una base PostgreSQL embebida (PGlite/WASM) con el mismo SQL que se
// ejecuta en Supabase. Se usa en las pruebas y en el emulador local de la API.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const here = dirname(fileURLToPath(import.meta.url))
export const sqlDir = resolve(here, '../../supabase')

export function readSql(name) {
  return readFileSync(resolve(sqlDir, name), 'utf8')
}

/**
 * @param {{ dataDir?: string, seed?: boolean }} options
 */
export async function createDatabase({ dataDir, seed = true } = {}) {
  const db = await PGlite.create(dataDir ? { dataDir, extensions: { pgcrypto } } : { extensions: { pgcrypto } })
  const installed = await db.query(
    "select 1 from information_schema.schemata where schema_name = 'app'",
  )
  if (installed.rows.length === 0) {
    await db.exec('create schema if not exists extensions;')
    await db.exec(readSql('01_schema.sql'))
    await db.exec(readSql('02_functions.sql'))
    if (seed) await db.exec(readSql('03_seed.sql'))
  }
  return db
}

/**
 * Ejecuta una función RPC con argumentos nombrados, igual que PostgREST.
 * @param {PGlite} db
 * @param {string} fn
 * @param {Record<string, unknown>} args
 */
export async function callRpc(db, fn, args = {}) {
  if (!/^[a-z_]+$/.test(fn)) throw Object.assign(new Error('Función inválida'), { code: 'PGRST202' })
  const keys = Object.keys(args)
  for (const key of keys) {
    if (!/^p_[a-z_]+$/.test(key)) throw Object.assign(new Error('Parámetro inválido'), { code: 'PGRST202' })
  }
  const placeholders = keys.map((key, index) => `${key} => $${index + 1}`).join(', ')
  const values = keys.map((key) => {
    const value = args[key]
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) return JSON.stringify(value)
    return value
  })
  const result = await db.query(`select public.${fn}(${placeholders}) as result`, values)
  return result.rows[0]?.result ?? null
}
