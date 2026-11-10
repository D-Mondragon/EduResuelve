export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const MAX_EVIDENCES = 10
/** Bytes por parte antes de base64 (≈ 512 KB codificados). */
export const CHUNK_BYTES = 384 * 1024

export const allowedMimeTypes = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
} as const
export type AllowedMime = keyof typeof allowedMimeTypes

export const acceptAttribute = '.pdf,.jpg,.jpeg,.png,.docx,' + Object.keys(allowedMimeTypes).join(',')

const extensionMime: Record<string, AllowedMime> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export function detectMime(file: { name: string; type: string }): AllowedMime | null {
  if (file.type in allowedMimeTypes) return file.type as AllowedMime
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  return extensionMime[extension] ?? null
}

export function isCompressibleImage(mime: AllowedMime | null): boolean {
  return mime === 'image/jpeg' || mime === 'image/png'
}

export interface PreparedFile {
  blob: Blob
  fileName: string
  mimeType: AllowedMime
  originalSize: number
  compressed: boolean
}

export type PrepareResult = { ok: true; file: PreparedFile } | { ok: false; message: string }

/**
 * Valida el archivo y comprime las imágenes en el navegador.
 * Los PDF y DOCX no se comprimen: si superan 10 MB se rechazan con aviso.
 */
export async function prepareFile(
  file: File,
  compress: (file: File) => Promise<Blob | null> = compressImage,
): Promise<PrepareResult> {
  const mime = detectMime(file)
  if (!mime) {
    return { ok: false, message: `"${file.name}" no es un tipo permitido. Usa PDF, JPG, PNG o DOCX.` }
  }
  if (file.size === 0) {
    return { ok: false, message: `"${file.name}" está vacío.` }
  }

  if (isCompressibleImage(mime)) {
    const compressed = await compress(file).catch(() => null)
    if (compressed && compressed.size < file.size) {
      if (compressed.size > MAX_FILE_BYTES) {
        return { ok: false, message: `La imagen sigue superando 10 MB después de comprimirla. Reduce su resolución.` }
      }
      return {
        ok: true,
        file: {
          blob: compressed,
          fileName: file.name.replace(/\.(png|jpe?g)$/i, '') + '.jpg',
          mimeType: 'image/jpeg',
          originalSize: file.size,
          compressed: true,
        },
      }
    }
  }

  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      message: isCompressibleImage(mime)
        ? `La imagen supera 10 MB y no se pudo comprimir lo suficiente.`
        : `"${file.name}" pesa más de 10 MB. Los archivos ${allowedMimeTypes[mime]} no se pueden comprimir automáticamente: reduce su tamaño o divídelo antes de subirlo.`,
    }
  }
  return { ok: true, file: { blob: file, fileName: file.name, mimeType: mime, originalSize: file.size, compressed: false } }
}

/** Redimensiona a un máximo de 1920 px y convierte a JPEG, bajando calidad si hace falta. */
export async function compressImage(file: File): Promise<Blob | null> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return null
  const bitmap = await createImageBitmap(file)
  const attempts: Array<[number, number]> = [
    [1920, 0.82],
    [1600, 0.72],
    [1280, 0.62],
  ]
  let best: Blob | null = null
  for (const [maxSide, quality] of attempts) {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) return null
    context.fillStyle = '#ffffff' // fondo blanco para PNG con transparencia
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    best = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (best && best.size <= 2 * 1024 * 1024) break
  }
  bitmap.close()
  return best
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const step = 0x8000
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step))
  }
  return btoa(binary)
}

export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function splitIntoChunks(blob: Blob, chunkBytes = CHUNK_BYTES): Promise<string[]> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const chunks: string[] = []
  for (let offset = 0; offset < bytes.length; offset += chunkBytes) {
    chunks.push(bytesToBase64(bytes.subarray(offset, offset + chunkBytes)))
  }
  return chunks
}

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
