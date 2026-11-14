import type { PGlite } from '@electric-sql/pglite'
import { callRpc, createDatabase } from '../../scripts/pglite-db.mjs'

export const PASSWORD = 'EduResuelve2026'

export const DNI = {
  alicia: '70000001', // Estudiante
  bruno: '70000002', // Estudiante
  camila: '70000003', // Docente
  damian: '70000004', // Docente inactivo
  estela: '70000005', // Orientador
  fabian: '70000006', // Orientador
  greta: '70000007', // Administrador
  hugo: '70000008', // Administrador inactivo
} as const

export const USER_ID = {
  alicia: '00000000-0000-4000-a000-000000000001',
  bruno: '00000000-0000-4000-a000-000000000002',
  camila: '00000000-0000-4000-a000-000000000003',
  damian: '00000000-0000-4000-a000-000000000004',
  estela: '00000000-0000-4000-a000-000000000005',
  fabian: '00000000-0000-4000-a000-000000000006',
  greta: '00000000-0000-4000-a000-000000000007',
  hugo: '00000000-0000-4000-a000-000000000008',
} as const

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface TestDb {
  db: PGlite
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<any>
  login: (who: keyof typeof DNI, password?: string) => Promise<string>
  expectError: (promise: Promise<unknown>, code: string, message?: string | RegExp) => Promise<void>
}

export async function setupDb(): Promise<TestDb> {
  const db: PGlite = await createDatabase()
  const rpc = (fn: string, args: Record<string, unknown> = {}) => callRpc(db, fn, args)

  async function login(who: keyof typeof DNI, password = PASSWORD) {
    const result = await rpc('login', { p_dni: DNI[who], p_password: password })
    if (!result?.token) throw new Error(`Login falló para ${who}: ${result?.error}`)
    return result.token as string
  }

  async function expectError(promise: Promise<unknown>, code: string, message?: string | RegExp) {
    let error: any
    try {
      await promise
    } catch (caught) {
      error = caught
    }
    if (!error) throw new Error(`Se esperaba un error ${code} pero la operación tuvo éxito`)
    if (error.code !== code) {
      throw new Error(`Se esperaba el código ${code} y se obtuvo ${error.code}: ${error.message}`)
    }
    if (message) {
      const ok = typeof message === 'string' ? error.message.includes(message) : message.test(error.message)
      if (!ok) throw new Error(`Mensaje inesperado: "${error.message}"`)
    }
  }

  return { db, rpc, login, expectError }
}

/** Datos mínimos del registro formal (D.S. 021-2026-MINEDU, 8.2), exigido antes de asignar. */
export const formalData = {
  regime: 'Ninguno',
  incidentTime: '10:30',
  immediateActions: 'Se separó a los estudiantes y se informó a Orientación.',
  objective: true,
}

export const validIncident = {
  title: 'Prueba de registro',
  description: 'Descripción de prueba suficiente.',
  category: 'Convivencia',
  priority: 'Media',
  incidentDate: '2026-10-01',
  location: 'Aula 1',
  involvedPeople: 'Grupo 3A',
}

// PNG de 1x1 píxel
export const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
