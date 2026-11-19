import { describe, expect, it } from 'vitest'
import { HELP_LINES, MONTH_THEMES, isCounselorAudience, pickCounselorMessage } from './counselor'

describe('Mensajes del consejero', () => {
  it('CP-UI-41: hay un tema con mensajes para estudiantes y docentes en cada mes', () => {
    expect(MONTH_THEMES).toHaveLength(12)
    for (const theme of MONTH_THEMES) {
      expect(theme.Estudiante.length).toBeGreaterThan(0)
      expect(theme.Docente.length).toBeGreaterThan(0)
    }
  })

  it('CP-UI-42: en setiembre el mensaje trata la prevención del suicidio y ofrece la línea de ayuda', () => {
    for (const r of [0, 0.5, 0.99]) {
      const { tag, message } = pickCounselorMessage('Estudiante', new Date(2026, 8, 15), () => r)
      expect(tag).toMatch(/prevención del suicidio/)
      expect(message.help).toBe('salud-mental')
      expect(HELP_LINES[message.help!]).toMatch(/113, opción 5/)
    }
  })

  it('CP-UI-43: el mensaje sale del mes y del rol, al azar dentro del mes', () => {
    const may = new Date(2026, 4, 2)
    const a = pickCounselorMessage('Docente', may, () => 0)
    const b = pickCounselorMessage('Docente', may, () => 0.99)
    expect(a.tag).toMatch(/acoso escolar/)
    expect(MONTH_THEMES[4].Docente).toContain(a.message)
    expect(a.message).not.toBe(b.message)
    expect(pickCounselorMessage('Estudiante', new Date(2026, 10, 5), () => 0.999).index).toBeLessThan(MONTH_THEMES[10].Estudiante.length)
  })

  it('CP-UI-44: solo estudiantes y docentes ven al consejero', () => {
    expect(isCounselorAudience('Estudiante')).toBe(true)
    expect(isCounselorAudience('Docente')).toBe(true)
    expect(isCounselorAudience('Orientador')).toBe(false)
    expect(isCounselorAudience('Administrador')).toBe(false)
  })
})
