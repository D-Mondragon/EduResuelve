import type { ActaCase, ActaCaseParticipant } from '../types/acta'

/** DNI parcialmente oculto para documentos impresos: 71****67. */
export function maskDni(dni: string | null | undefined): string {
  if (!dni) return ''
  return dni.length >= 4 ? `${dni.slice(0, 2)}****${dni.slice(-2)}` : '****'
}

/** Iniciales para documentos dirigidos a terceros (R.M. 383-2025-MINEDU, principio 3.8): "M. P. U." */
export function nameInitials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part[0]!.toLocaleUpperCase('es')}.`)
    .join(' ')
}

/**
 * Versiones del acta:
 *  - completa: archivo interno, nombres completos y DNI parcialmente oculto.
 *  - familia: copia para la familia de un estudiante; los demás estudiantes, solo con iniciales y sin su versión
 *    (D.S. 021-2026-MINEDU, 8.2: "protegiendo los datos de otros estudiantes").
 *  - terceros: UGEL, DEMUNA, Fiscalía…: todos los estudiantes con iniciales y DNI (principio 3.8).
 */
export type ActaCopy = 'completa' | 'familia' | 'terceros'

export const actaCopyLabels: Record<ActaCopy, string> = {
  completa: 'Completa (archivo interno)',
  familia: 'Copia para la familia',
  terceros: 'Para terceros (UGEL, DEMUNA, Fiscalía)',
}

export interface ShownParticipant {
  id: number
  role: ActaCaseParticipant['role']
  name: string
  dni: string
  gradeSection: string
  /** null: la versión no se muestra en esta copia (es de otro estudiante). */
  statement: Pick<ActaCaseParticipant, 'statement' | 'statementStatus' | 'statementBy' | 'statementAt'> | null
  own: boolean
}

export function showParticipant(p: ActaCaseParticipant, copy: ActaCopy, familyOf: number | null): ShownParticipant {
  const own = copy === 'familia' && p.id === familyOf
  const full = copy === 'completa' || own
  return {
    id: p.id,
    role: p.role,
    name: full ? p.fullName : nameInitials(p.fullName),
    dni: copy === 'terceros' ? (p.dni ?? '') : full ? maskDni(p.dni) : '',
    gradeSection: p.gradeSection,
    statement:
      copy === 'familia' && !own
        ? null
        : { statement: p.statement, statementStatus: p.statementStatus, statementBy: p.statementBy, statementAt: p.statementAt },
    own,
  }
}

/** Estudiantes que pueden recibir una copia para su familia. */
export function familyCandidates(c: ActaCase | undefined): ActaCaseParticipant[] {
  return (c?.participants ?? []).filter((p) => p.role !== 'Testigo')
}

/** Medidas visibles en la copia: en la de una familia, solo las de su estudiante. */
export function visibleMeasures(c: ActaCase, copy: ActaCopy, familyOf: number | null): ActaCase['measures'] {
  return copy === 'familia' ? c.measures.filter((m) => m.participantId === familyOf) : c.measures
}

/** ¿Debe firmar Dirección? Faltas graves o muy graves, y casos de violencia escolar (D.S. 021-2026, IX; R.M. 383-2025). */
export function needsDirectorSignature(c: ActaCase | undefined): boolean {
  if (!c) return false
  return c.severity === 'Grave' || c.severity === 'Muy grave' || c.regime === 'Violencia' || c.regime === 'Disciplina y violencia'
}

/** Base normativa que se cita en el encabezado según el régimen. */
export function legalBasis(c: ActaCase | undefined): string[] {
  const base = ['Ley 29733, Ley de Protección de Datos Personales, y su reglamento (D.S. 016-2024-JUS)']
  if (!c || c.regime === 'Ninguno') return base
  const items: string[] = []
  if (c.regime === 'Disciplina' || c.regime === 'Disciplina y violencia') {
    items.push('D.S. 021-2026-MINEDU, Lineamientos para la gestión de la disciplina escolar (anexo, numerales 8.2 y 9.1)')
  }
  if (c.regime === 'Violencia' || c.regime === 'Disciplina y violencia') {
    items.push('Ley 29719, Ley que promueve la convivencia sin violencia en las instituciones educativas, y su reglamento (D.S. 010-2012-ED)')
    items.push('R.M. 383-2025-MINEDU, protocolos para la atención de la violencia escolar')
  }
  items.push('D.S. 004-2018-MINEDU, Lineamientos para la gestión de la convivencia escolar')
  return [...items, ...base]
}

/** Instituciones a las que se puede dirigir una copia para terceros. */
export const thirdPartyRecipients = ['DEMUNA', 'UGEL', 'UPE', 'PNP', 'Fiscalía', 'Centro de salud', 'Otra'] as const

/** Iniciales sin puntos ni tildes, aptas para un nombre de archivo: "Mateo Prueba Uno" → "MPU". */
export function fileInitials(fullName: string): string {
  return nameInitials(fullName)
    .normalize('NFD')
    .replace(/[^A-Za-z]/g, '')
}

/**
 * Nombre del PDF del acta (el navegador lo toma del título de la página). Solo el número del acta
 * y, en las copias, a quién va dirigida; nunca el asunto del caso:
 *   ACT-2026-0012-02 · ACT-2026-0012-02-familia-DRS · ACT-2026-0012-02-terceros-DEMUNA
 */
export function actaFileName(number: string, copy: ActaCopy, familyName?: string | null, recipient?: string | null): string {
  if (copy === 'familia') return familyName ? `${number}-familia-${fileInitials(familyName)}` : `${number}-familia`
  if (copy === 'terceros') {
    const to = (recipient ?? '').normalize('NFD').replace(/[^A-Za-z0-9]+/g, '')
    return to ? `${number}-terceros-${to}` : `${number}-terceros`
  }
  return number
}
