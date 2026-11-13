import qrcode from 'qrcode-generator'

/**
 * Trazado SVG de un código QR (corrección de errores M: sigue leyéndose con ~15 % dañado,
 * suficiente para un acta impresa con sello o firma encima).
 * Devuelve el tamaño en módulos (sin margen) y un único path con todos los módulos oscuros.
 */
export function qrPath(text: string): { size: number; path: string } {
  const qr = qrcode(0, 'M')
  qr.addData(text, 'Byte')
  qr.make()
  const size = qr.getModuleCount()
  let path = ''
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.isDark(row, col)) path += `M${col} ${row}h1v1h-1z`
    }
  }
  return { size, path }
}
