import { describe, expect, it } from 'vitest'
import type { ActaCase } from '../types/acta'
import { familyCandidates, legalBasis, maskDni, nameInitials, needsDirectorSignature, showParticipant, visibleMeasures } from './caseDocs'
import { emptyFormal, validateFormal } from './formal'

const kase: ActaCase = {
  regime: 'Disciplina',
  incidentTime: '10:30',
  immediateActions: 'Se separó a los estudiantes.',
  formalRegisteredBy: { fullName: 'Estela Inventada', role: 'Orientador', dni: '70****05' },
  formalRegisteredAt: '2026-11-10T15:00:00Z',
  severity: 'Leve',
  directorNotifiedAt: null,
  directorLate: null,
  directorAckBy: null,
  directorAckAt: null,
  violenceType: null,
  violenceModality: null,
  siseveCode: null,
  bookFolio: null,
  participants: [
    { id: 1, role: 'Estudiante involucrado', fullName: 'Mateo Prueba Uno', dni: '71234567', gradeSection: '3.º B', statement: 'Fue un juego.', statementStatus: 'Registrada', statementBy: 'Estudiante', statementAt: '2026-11-10T16:00:00Z' },
    { id: 2, role: 'Estudiante afectado', fullName: 'lucía ejemplo dos', dni: null, gradeSection: '3.º B', statement: 'Me empujó.', statementStatus: 'Registrada', statementBy: 'Padre, madre o apoderado', statementAt: '2026-11-10T16:30:00Z' },
    { id: 3, role: 'Testigo', fullName: 'Ana Testigo', dni: '72345678', gradeSection: '', statement: '', statementStatus: 'Pendiente', statementBy: null, statementAt: null },
  ],
  measures: [
    { participantId: 1, kind: 'Formativa', description: 'Reflexión guiada.', isSeparation: false, decidedBy: null, decidedAt: '2026-11-11T10:00:00Z' },
    { participantId: 2, kind: 'Correctiva', description: 'Otra medida.', isSeparation: false, decidedBy: null, decidedAt: '2026-11-11T10:00:00Z' },
  ],
  meetings: [],
  referrals: [],
}

describe('Versiones del acta y datos de estudiantes (D.S. 021-2026-MINEDU; R.M. 383-2025-MINEDU)', () => {
  it('CP-UI-30: iniciales y DNI parcialmente oculto', () => {
    expect(nameInitials('Mateo Prueba Uno')).toBe('M. P. U.')
    expect(nameInitials('  lucía   ejemplo ')).toBe('L. E.')
    expect(maskDni('71234567')).toBe('71****67')
    expect(maskDni(null)).toBe('')
  })

  it('CP-UI-31: versión completa: nombres completos y DNI oculto en parte', () => {
    const shown = showParticipant(kase.participants[0], 'completa', null)
    expect(shown).toMatchObject({ name: 'Mateo Prueba Uno', dni: '71****67', own: false })
    expect(shown.statement?.statement).toBe('Fue un juego.')
  })

  it('CP-UI-32: copia para la familia: su estudiante completo; los demás con iniciales, sin DNI ni versión', () => {
    const own = showParticipant(kase.participants[0], 'familia', 1)
    const other = showParticipant(kase.participants[1], 'familia', 1)
    expect(own).toMatchObject({ name: 'Mateo Prueba Uno', dni: '71****67', own: true })
    expect(other).toMatchObject({ name: 'L. E. D.', dni: '', statement: null, own: false })
    expect(visibleMeasures(kase, 'familia', 1).map((m) => m.participantId)).toEqual([1])
    expect(visibleMeasures(kase, 'completa', null)).toHaveLength(2)
  })

  it('CP-UI-33: copia para terceros: solo iniciales y DNI completo (principio 3.8)', () => {
    expect(showParticipant(kase.participants[0], 'terceros', null)).toMatchObject({ name: 'M. P. U.', dni: '71234567' })
    expect(showParticipant(kase.participants[2], 'terceros', null)).toMatchObject({ name: 'A. T.', dni: '72345678' })
  })

  it('CP-UI-34: la familia que recibe copia es la de un estudiante, no la de un testigo', () => {
    expect(familyCandidates(kase).map((p) => p.id)).toEqual([1, 2])
    expect(familyCandidates(undefined)).toEqual([])
  })

  it('CP-UI-35: Dirección firma en faltas graves o muy graves y en casos de violencia', () => {
    expect(needsDirectorSignature(kase)).toBe(false)
    expect(needsDirectorSignature({ ...kase, severity: 'Grave' })).toBe(true)
    expect(needsDirectorSignature({ ...kase, severity: null, regime: 'Violencia' })).toBe(true)
    expect(needsDirectorSignature(undefined)).toBe(false)
  })

  it('CP-UI-36: la base normativa depende del régimen', () => {
    expect(legalBasis({ ...kase, regime: 'Ninguno' })).toHaveLength(1)
    expect(legalBasis(kase).join(' ')).toContain('D.S. 021-2026-MINEDU')
    const violence = legalBasis({ ...kase, regime: 'Violencia' }).join(' ')
    expect(violence).toContain('R.M. 383-2025-MINEDU')
    expect(violence).toContain('Ley 29719')
    expect(violence).not.toContain('D.S. 021-2026-MINEDU')
  })

  it('CP-UI-37: el registro formal exige régimen, hora, acciones inmediatas y la declaración de objetividad', () => {
    expect(Object.keys(validateFormal(emptyFormal)).sort()).toEqual(['immediateActions', 'incidentTime', 'objective', 'regime'])
    expect(validateFormal({ regime: 'Disciplina', incidentTime: '24:10', immediateActions: 'x', objective: true })).toEqual({
      incidentTime: 'Indica la hora del hecho.',
    })
    expect(validateFormal({ regime: 'Ninguno', incidentTime: '08:05', immediateActions: 'Ninguna.', objective: true })).toEqual({})
  })
})
