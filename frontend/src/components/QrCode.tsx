import { useMemo } from 'react'
import { qrPath } from '../lib/qr'

/** Código QR vectorial: nítido en pantalla y al imprimir; siempre negro sobre blanco para que se pueda escanear. */
export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const { size, path } = useMemo(() => qrPath(value), [value])
  const quiet = 4 // margen blanco que exige el estándar
  const box = size + quiet * 2
  return (
    <svg
      aria-label={label}
      className={className}
      role="img"
      shapeRendering="crispEdges"
      viewBox={`${-quiet} ${-quiet} ${box} ${box}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#fff" height={box} width={box} x={-quiet} y={-quiet} />
      <path d={path} fill="#000" />
    </svg>
  )
}
