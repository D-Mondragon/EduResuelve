import { describe, expect, it } from 'vitest'
import type { IncidentAction, IncidentSummary } from '../types/incident'
import { followUpEvent, formatDuration, institutionName, personLabel, verifyUrl } from './acta'
import { toCsv } from './csv'
import { byCategory, byLocation, byMonth, byResponsible, median, monthLabel, pct, pending, summarize, unassignedOpen } from './reports'
import type { ReportRow } from '../types/report'
import { PERF_MAX_PER_SEND, PERF_MAX_QUEUE, PerfBuffer } from './perf'
import { base64ToBytes, bytesToBase64, detectMime, MAX_FILE_BYTES, prepareFile, splitIntoChunks } from './files'
import { formatBytes, formatDate, formatDateTime, todayInLima } from './format'
import { canManageUsers, canViewAudit, isManager, nextStep } from './permissions'
import {
  generateTemporaryPassword,
  initials,
  isValidDni,
  isValidEmail,
  isValidPassword,
  validateIncidentForm,
} from './validation'

function fakeFile(name: string, type: string, size: number) {
  return new File([new Uint8Array(size)], name, { type })
}

describe('Validaciones', () => {
  it('CP-UI-01: DNI de 8 dígitos', () => {
    expect(isValidDni('70000001')).toBe(true)
    expect(isValidDni('7000000')).toBe(false)
    expect(isValidDni('7000000a')).toBe(false)
  })

  it('CP-UI-02: política de contraseñas y generador', () => {
    expect(isValidPassword('abcdefg1')).toBe(true)
    expect(isValidPassword('abcdefgh')).toBe(false)
    expect(isValidPassword('12345678')).toBe(false)
    expect(isValidPassword('abc1')).toBe(false)
    for (let i = 0; i < 20; i++) expect(isValidPassword(generateTemporaryPassword())).toBe(true)
  })

  it('CP-UI-03: correo e iniciales', () => {
    expect(isValidEmail('a@b.pe')).toBe(true)
    expect(isValidEmail('a@b')).toBe(false)
    expect(initials('Greta Demostración')).toBe('GD')
  })

  it('CP-UI-04: formulario de incidencia exige campos y rechaza fechas futuras', () => {
    const errors = validateIncidentForm(
      { title: '', description: '', category: '', priority: '', incidentDate: '2026-12-31', location: '', involvedPeople: '' },
      '2026-11-10',
    )
    expect(Object.keys(errors).sort()).toEqual(['category', 'description', 'incidentDate', 'location', 'priority', 'title'])
    expect(errors.incidentDate).toBe('La fecha no puede ser futura.')
  })
})

describe('Formatos (zona horaria de Lima)', () => {
  it('CP-UI-05: muestra la hora en America/Lima, no en UTC', () => {
    // 01:30 UTC del 11/11 = 20:30 del 10/11 en Lima
    expect(formatDateTime('2026-11-11T01:30:00Z')).toMatch(/10 nov.*8:30/)
    expect(todayInLima(new Date('2026-11-11T01:30:00Z'))).toBe('2026-11-10')
  })

  it('CP-UI-06: fechas calendario sin desfase y tamaños legibles', () => {
    expect(formatDate('2026-09-24')).toMatch(/24 set/)
    expect(formatBytes(1536)).toBe('2 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5,0 MB')
  })
})

describe('Archivos y compresión', () => {
  it('CP-UI-07: detecta tipos permitidos por MIME o extensión', () => {
    expect(detectMime({ name: 'a.PDF', type: '' })).toBe('application/pdf')
    expect(detectMime({ name: 'foto.jpeg', type: 'image/jpeg' })).toBe('image/jpeg')
    expect(detectMime({ name: 'virus.exe', type: 'application/x-msdownload' })).toBeNull()
  })

  it('CP-UI-08: comprime imágenes grandes y las acepta', async () => {
    const big = fakeFile('foto.png', 'image/png', MAX_FILE_BYTES + 100)
    const result = await prepareFile(big, async () => new Blob([new Uint8Array(800_000)], { type: 'image/jpeg' }))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.file).toMatchObject({ fileName: 'foto.jpg', mimeType: 'image/jpeg', compressed: true })
      expect(result.file.originalSize).toBe(MAX_FILE_BYTES + 100)
    }
  })

  it('CP-UI-09: mantiene el original si la compresión no reduce el tamaño', async () => {
    const small = fakeFile('icono.png', 'image/png', 500)
    const result = await prepareFile(small, async () => new Blob([new Uint8Array(900)]))
    expect(result.ok && result.file.compressed).toBe(false)
  })

  it('CP-UI-10: rechaza PDF/DOCX de más de 10 MB con aviso de que no se comprimen', async () => {
    const result = await prepareFile(fakeFile('informe.pdf', 'application/pdf', MAX_FILE_BYTES + 1), async () => null)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/no se pueden comprimir automáticamente/)
  })

  it('CP-UI-11: rechaza tipos no permitidos y archivos vacíos', async () => {
    expect((await prepareFile(fakeFile('a.zip', 'application/zip', 10))).ok).toBe(false)
    expect((await prepareFile(fakeFile('a.pdf', 'application/pdf', 0))).ok).toBe(false)
  })

  it('CP-UI-12: divide en partes base64 y se reconstruye sin pérdidas', async () => {
    const bytes = new Uint8Array(1000).map((_, i) => i % 256)
    const chunks = await splitIntoChunks(new Blob([bytes]), 300)
    expect(chunks).toHaveLength(4)
    const rebuilt = chunks.flatMap((chunk) => Array.from(base64ToBytes(chunk)))
    expect(rebuilt).toEqual(Array.from(bytes))
    expect(bytesToBase64(new Uint8Array([104, 111, 108, 97]))).toBe('aG9sYQ==')
  })
})

describe('Exportación CSV', () => {
  it('CP-UI-13: usa ";" y BOM, escapa comillas y evita inyección de fórmulas', () => {
    const csv = toCsv(['A', 'B'], [['=SUMA(1)', 'dice "hola"; adiós']])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain(`'=SUMA(1);"dice ""hola""; adiós"`)
  })
})

describe('Permisos en la interfaz (RN-010)', () => {
  const incident = (actions: IncidentAction[]) => ({ code: 'ER-2026-0001', allowedActions: actions }) as IncidentSummary

  it('CP-UI-14: roles gestores y administrador', () => {
    expect(isManager('Orientador')).toBe(true)
    expect(isManager('Docente')).toBe(false)
    expect(canManageUsers('Orientador')).toBe(false)
    expect(canManageUsers('Administrador')).toBe(true)
    expect(canViewAudit('Administrador')).toBe(true)
  })

  it('CP-UI-15: sugiere el siguiente paso según las acciones permitidas', () => {
    expect(nextStep(incident(['review', 'edit']))?.label).toBe('Iniciar revisión')
    expect(nextStep(incident(['assign', 'discard']))?.label).toBe('Asignar responsable')
    expect(nextStep(incident(['resolve']))?.to).toBe('/incidencias/ER-2026-0001/resolucion')
    expect(nextStep(incident(['reassign', 'start']))?.label).toBe('Reasignar responsable')
    expect(nextStep(incident(['observe', 'evidence']))).toBeNull()
  })
})

describe('Acta de resolución (RN-011)', () => {
  it('CP-UI-19: expresa la duración de la atención en días y horas', () => {
    expect(formatDuration(null)).toBe('—')
    expect(formatDuration(0.4)).toBe('menos de 1 h')
    expect(formatDuration(18)).toBe('18 h')
    expect(formatDuration(24)).toBe('1 día')
    expect(formatDuration(73)).toBe('3 días y 1 h')
  })

  it('CP-UI-20: describe los movimientos de la cronología y arma el enlace de verificación', () => {
    const base = { createdAt: '2026-09-20T10:00:00Z', user: null }
    expect(followUpEvent({ ...base, kind: 'Registro', previousStatus: null, newStatus: 'Nuevo' })).toBe('Registro de la incidencia')
    expect(followUpEvent({ ...base, kind: 'Cambio de estado', previousStatus: 'Resuelto', newStatus: 'Cerrado' })).toBe('Resuelto → Cerrado')
    expect(personLabel({ fullName: 'Ana Pérez', role: 'Docente' })).toBe('Ana Pérez (Docente)')
    expect(personLabel({ role: 'Estudiante' })).toBe('Estudiante')
    expect(verifyUrl('1A2B-3C4D-5E6F-7A8B', 'https://app.test')).toBe('https://app.test/verificar?codigo=1A2B-3C4D-5E6F-7A8B')
    expect(institutionName()).toBeTruthy()
  })
})

describe('Tiempos de respuesta (RNF-001)', () => {
  const s = (ms: number) => ({ fn: 'me', ms, ok: true, device: 'Escritorio' as const })

  it('CP-UI-21: agrupa mediciones y las envía al completar el lote', async () => {
    const sent: number[][] = []
    const buffer = new PerfBuffer(async (batch) => void sent.push(batch.map((x) => x.ms)), { batchSize: 3 })
    buffer.add(s(10.4))
    buffer.add(s(-1)) // inválida: se ignora
    buffer.add(s(Number.NaN))
    buffer.add(s(20))
    expect(sent).toHaveLength(0)
    buffer.add(s(30))
    await Promise.resolve()
    expect(sent).toEqual([[10, 20, 30]])
    expect(buffer.size).toBe(0)
  })

  it('CP-UI-22: si el envío falla conserva las mediciones; sin sesión no envía', async () => {
    let fail = true
    let logged = false
    const sent: number[] = []
    const buffer = new PerfBuffer(
      async (batch) => {
        if (fail) throw new Error('sin red')
        sent.push(...batch.map((x) => x.ms))
      },
      { batchSize: 100, canSend: () => logged },
    )
    buffer.add(s(1))
    await buffer.flush()
    expect(buffer.size).toBe(1) // sin sesión: espera
    logged = true
    await buffer.flush()
    expect(buffer.size).toBe(1) // falló la red: se reintenta luego
    fail = false
    await buffer.flush()
    expect(sent).toEqual([1])
    expect(buffer.size).toBe(0)
  })

  it('CP-UI-23: limita la cola y el tamaño de cada envío', async () => {
    const sizes: number[] = []
    const buffer = new PerfBuffer(async (batch) => void sizes.push(batch.length), {
      batchSize: 10_000,
      canSend: () => true,
    })
    for (let i = 0; i < PERF_MAX_QUEUE + 30; i++) buffer.add(s(i))
    expect(buffer.size).toBe(PERF_MAX_QUEUE)
    await buffer.flush()
    expect(sizes).toEqual([PERF_MAX_PER_SEND])
  })
})

describe('Reportes', () => {
  const user = (id: string, fullName: string) => ({ id, fullName, role: 'Docente' as const, email: '', status: 'Activo' as const })
  const row = (over: Partial<ReportRow>): ReportRow => ({
    code: 'ER-2026-0001', title: 'T', category: 'Convivencia', priority: 'Media', status: 'Cerrado', location: 'Aula 1',
    incidentDate: '2026-09-01', registeredAt: '2026-09-01T15:00:00Z', updatedAt: '2026-09-02T15:00:00Z',
    reporter: null, responsible: user('a', 'Ana'), pendingReassignment: false, targetHours: 168,
    resolvedAt: null, closedAt: null, hoursToResolve: 24, hoursToClose: 30, ageHours: 500, acta: null, surveyRating: null,
    ...over,
  })

  it('CP-UI-24: resume totales, abiertas, vencidas, % en meta, mediana y satisfacción', () => {
    const rows = [
      row({ hoursToResolve: 24, surveyRating: 5 }),
      row({ hoursToResolve: 200, surveyRating: 3 }), // fuera de meta (168 h)
      row({ status: 'En atención', hoursToResolve: null, ageHours: 300 }), // abierta y vencida
      row({ status: 'Asignado', hoursToResolve: null, ageHours: 10 }), // abierta en plazo
      row({ status: 'Descartado', hoursToResolve: null }),
    ]
    expect(summarize(rows)).toEqual({
      total: 5, open: 2, overdue: 1, resolved: 2, closed: 2, discarded: 1,
      withinTargetPct: 50, avgHoursToResolve: 112, medianHoursToResolve: 112, avgRating: 4, ratings: 2,
    })
    expect(median([])).toBeNull()
    expect(pct(0, 0)).toBeNull()
  })

  it('CP-UI-25: agrupa por mes (hora de Lima), responsable, categoría y lugar', () => {
    const rows = [
      row({ registeredAt: '2026-10-01T03:00:00Z' }), // 30 de setiembre en Lima
      row({ registeredAt: '2026-10-15T15:00:00Z', responsible: user('b', 'Bruno'), status: 'En atención', hoursToResolve: null }),
      row({ registeredAt: '2026-10-20T15:00:00Z', responsible: null, status: 'Nuevo', hoursToResolve: null, location: 'Patio', category: 'Académica' }),
    ]
    expect(byMonth(rows).map((m) => [m.key, m.total])).toEqual([['2026-10', 2], ['2026-09', 1]])
    expect(monthLabel('2026-09')).toBe('Setiembre de 2026')
    expect(byResponsible(rows).map((r) => [r.name, r.total, r.open])).toEqual([['Bruno', 1, 1], ['Ana', 1, 0]])
    expect(unassignedOpen(rows)).toBe(1)
    expect(byCategory(rows).find((c) => c.category === 'Académica')?.total).toBe(1)
    expect(byCategory(rows)).toHaveLength(5)
    expect(byLocation(rows)[0]).toEqual({ location: 'Aula 1', total: 2, open: 1, topCategory: 'Convivencia' })
  })

  it('CP-UI-26: pendientes ordenadas por la proporción de la meta consumida', () => {
    const rows = [
      row({ code: 'A', status: 'Asignado', priority: 'Baja', targetHours: 360, ageHours: 180 }), // 50 %
      row({ code: 'B', status: 'Nuevo', priority: 'Crítica', targetHours: 24, ageHours: 48 }), // 200 %, vencida
      row({ code: 'C', status: 'Cerrado' }),
    ]
    expect(pending(rows).map((r) => [r.code, r.targetUsedPct, r.overdue])).toEqual([['B', 200, true], ['A', 50, false]])
  })
})
