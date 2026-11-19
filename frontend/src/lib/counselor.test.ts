import { describe, expect, it } from 'vitest'
import { HELP_LINES, MONTH_THEMES, isCounselorAudience, pickCounselorMessage } from './counselor'

const MONTHS = /enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre/i

describe('Mensajes del consejero', () => {
  it('CP-UI-41: cada mes tiene tema y mensajes para estudiantes y docentes, sin fechas en el tema', () => {
    expect(MONTH_THEMES).toHaveLength(12)
    for (const theme of MONTH_THEMES) {
      expect(theme.tag).not.toMatch(MONTHS)
      expect(theme.tag).not.toMatch(/\(/)
      expect(theme.Estudiante.length).toBeGreaterThan(0)
      expect(theme.Docente.length).toBeGreaterThan(0)
      // Mensajes fluidos: más de una oración
      for (const m of [...theme.Estudiante, ...theme.Docente]) expect(m.text.split(/[.!?:]\s/).length).toBeGreaterThan(1)
    }
  })

  it('CP-UI-42: en setiembre el mensaje trata la prevención del suicidio y ofrece la Línea 113, opción 5', () => {
    for (const r of [0, 0.5, 0.99]) {
      const { tag, message } = pickCounselorMessage('Estudiante', new Date(2026, 8, 15), () => r)
      expect(tag).toMatch(/suicidio/)
      expect(message.help).toBe('salud-mental')
      expect(HELP_LINES['salud-mental'].Estudiante.line).toMatch(/113.*opción 5/)
    }
  })

  it('CP-UI-43: el mensaje sale del mes y del rol, al azar, sin repetir el último mostrado', () => {
    const may = new Date(2026, 4, 2)
    const a = pickCounselorMessage('Docente', may, () => 0)
    const b = pickCounselorMessage('Docente', may, () => 0.99)
    expect(a.tag).toBe('No al acoso escolar')
    expect(MONTH_THEMES[4].Docente).toContain(a.message)
    expect(a.message).not.toBe(b.message)
    for (const r of [0, 0.5, 0.99]) {
      expect(pickCounselorMessage('Docente', may, () => r, a.message.text).message).not.toBe(a.message)
    }
    // Con un solo mensaje en el mes, se muestra aunque se repita
    const apr = MONTH_THEMES[3].Estudiante[0]
    expect(pickCounselorMessage('Estudiante', new Date(2026, 3, 10), () => 0, apr.text).message).toBe(apr)
  })

  it('CP-UI-44: solo estudiantes y docentes ven al consejero', () => {
    expect(isCounselorAudience('Estudiante')).toBe(true)
    expect(isCounselorAudience('Docente')).toBe(true)
    expect(isCounselorAudience('Orientador')).toBe(false)
    expect(isCounselorAudience('Administrador')).toBe(false)
  })
})
