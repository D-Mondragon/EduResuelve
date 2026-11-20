import { describe, expect, it } from 'vitest'
import { GENERAL_MESSAGES, HELP_LINES, MONTH_THEMES, counselorMood, counselorPool, isCounselorAudience, pickCounselorMessage } from './counselor'

const MONTHS = /enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre/i

describe('Mensajes del consejero', () => {
  it('CP-UI-41: cada mes tiene tema sin fechas y al menos 4 mensajes fluidos por rol', () => {
    expect(MONTH_THEMES).toHaveLength(12)
    for (let month = 0; month < 12; month++) {
      const theme = MONTH_THEMES[month]
      expect(theme.tag).not.toMatch(MONTHS)
      expect(theme.tag).not.toMatch(/\(/)
      for (const audience of ['Estudiante', 'Docente'] as const) {
        const pool = counselorPool(audience, month)
        expect(pool.length).toBeGreaterThanOrEqual(4)
        // Mensajes fluidos: más de una oración
        for (const m of pool) expect(m.text.split(/[.!?:]\s/).length).toBeGreaterThan(1)
      }
    }
  })

  it('CP-UI-42: en setiembre el mensaje del estudiante trata la prevención del suicidio con la Línea 113, opción 5', () => {
    for (const m of MONTH_THEMES[8].Estudiante) expect(m.help).toBe('salud-mental')
    const { tag } = pickCounselorMessage('Estudiante', new Date(2026, 8, 15), () => 0)
    expect(tag).toMatch(/suicidio/)
    expect(HELP_LINES['salud-mental'].Estudiante.line).toMatch(/113.*opción 5/)
  })

  it('CP-UI-43: el mensaje cambia en cada ingreso: al azar dentro del mes y sin repetir el último', () => {
    for (const audience of ['Estudiante', 'Docente'] as const) {
      for (let month = 0; month < 12; month++) {
        const date = new Date(2026, month, 10)
        let last = pickCounselorMessage(audience, date, () => 0).message.text
        for (const r of [0, 0.3, 0.6, 0.99, 0, 0.5]) {
          const next = pickCounselorMessage(audience, date, () => r, last).message.text
          expect(next).not.toBe(last)
          expect(counselorPool(audience, month).map((m) => m.text)).toContain(next)
          last = next
        }
      }
    }
  })

  it('CP-UI-44: solo estudiantes y docentes ven al consejero', () => {
    expect(isCounselorAudience('Estudiante')).toBe(true)
    expect(isCounselorAudience('Docente')).toBe(true)
    expect(isCounselorAudience('Orientador')).toBe(false)
    expect(isCounselorAudience('Administrador')).toBe(false)
  })

  it('CP-UI-45: setiembre, octubre y los mensajes de salud mental usan el zorrito empático', () => {
    expect(pickCounselorMessage('Docente', new Date(2026, 8, 1), () => 0).mood).toBe('empatico')
    expect(pickCounselorMessage('Docente', new Date(2026, 9, 1), () => 0).mood).toBe('empatico')
    expect(pickCounselorMessage('Estudiante', new Date(2026, 4, 2), () => 0.99).mood).toBe('consejero')
    expect(counselorMood(new Date(2026, 7, 1), { text: 'x', help: 'salud-mental' })).toBe('empatico')
    expect(counselorMood(new Date(2026, 7, 1), { text: 'x', help: 'violencia' })).toBe('consejero')
  })

  it('CP-UI-46: todos los meses el estudiante puede ver que no necesita el celular para reportar (Ley 32385)', () => {
    expect(GENERAL_MESSAGES.Estudiante.text).toMatch(/no necesitas tu celular/)
    expect(GENERAL_MESSAGES.Estudiante.text).toMatch(/sala de cómputo.*casa.*tutor/)
    for (let month = 0; month < 12; month++) expect(counselorPool('Estudiante', month)).toContain(GENERAL_MESSAGES.Estudiante)
  })

  it('CP-UI-47: al docente se le habla desde su responsabilidad y al estudiante con cercanía', () => {
    const docente = MONTH_THEMES.flatMap((t) => t.Docente).map((m) => m.text)
    expect(docente.filter((t) => /como docente|tu labor|tu deber|tu responsabilidad|tus decisiones/i.test(t)).length).toBeGreaterThanOrEqual(12)
    const estudiante = MONTH_THEMES.flatMap((t) => t.Estudiante).map((m) => m.text)
    expect(estudiante.some((t) => /si eres víctima/i.test(t))).toBe(true)
    expect(estudiante.some((t) => /si tú sufres|si sufres/i.test(t))).toBe(true)
  })
})
