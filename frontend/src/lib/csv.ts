/** Genera CSV compatible con Excel en español (separador ";" y BOM UTF-8). */
export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const escape = (value: string | number | null | undefined) => {
    const text = value === null || value === undefined ? '' : String(value)
    // Evita inyección de fórmulas al abrir en Excel
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
    return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
  }
  const lines = [headers, ...rows].map((row) => row.map(escape).join(';'))
  return '﻿' + lines.join('\r\n')
}
