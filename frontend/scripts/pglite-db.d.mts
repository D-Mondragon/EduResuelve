import type { PGlite } from '@electric-sql/pglite'
export const sqlDir: string
export function readSql(name: string): string
export function createDatabase(options?: { dataDir?: string; seed?: boolean }): Promise<PGlite>
export function callRpc(db: PGlite, fn: string, args?: Record<string, unknown>): Promise<unknown>
