/**
 * Medición de tiempos de respuesta (RNF-001: responder en menos de 3 s).
 * Mide lo que realmente espera la persona y lo envía en lotes, sin datos personales.
 */

export type Device = 'Escritorio' | 'Móvil'

export interface PerfSample {
  fn: string
  ms: number
  ok: boolean
  device: Device
}

export const PERF_BATCH_SIZE = 20
export const PERF_MAX_QUEUE = 200
export const PERF_MAX_PER_SEND = 50

export function currentDevice(): Device {
  try {
    return window.matchMedia('(max-width: 767px)').matches ? 'Móvil' : 'Escritorio'
  } catch {
    return 'Escritorio'
  }
}

/** Cola de mediciones: envía al llegar a `batchSize` o cuando se llama a flush(). */
export class PerfBuffer {
  private queue: PerfSample[] = []
  private sending = false
  private readonly send: (samples: PerfSample[]) => Promise<unknown>
  private readonly batchSize: number
  private readonly canSend: () => boolean

  constructor(
    send: (samples: PerfSample[]) => Promise<unknown>,
    options: { batchSize?: number; canSend?: () => boolean } = {},
  ) {
    this.send = send
    this.batchSize = options.batchSize ?? PERF_BATCH_SIZE
    this.canSend = options.canSend ?? (() => true)
  }

  get size() {
    return this.queue.length
  }

  add(sample: PerfSample) {
    if (!Number.isFinite(sample.ms) || sample.ms < 0) return
    this.queue.push({ ...sample, ms: Math.round(sample.ms) })
    // Si el servidor no responde por mucho tiempo, se descartan las más antiguas.
    if (this.queue.length > PERF_MAX_QUEUE) this.queue.splice(0, this.queue.length - PERF_MAX_QUEUE)
    if (this.queue.length >= this.batchSize) void this.flush()
  }

  async flush(): Promise<void> {
    if (this.sending || this.queue.length === 0 || !this.canSend()) return
    const batch = this.queue.splice(0, PERF_MAX_PER_SEND)
    this.sending = true
    try {
      await this.send(batch)
    } catch {
      // Se reintenta en el próximo envío; la medición nunca debe afectar el uso de la app.
      this.queue.unshift(...batch)
      if (this.queue.length > PERF_MAX_QUEUE) this.queue.length = PERF_MAX_QUEUE
    } finally {
      this.sending = false
    }
  }
}

/** Tiempo de carga de la página (navegación inicial), si el navegador lo informa. */
export function pageLoadMs(): number | null {
  try {
    const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    if (!entry || entry.loadEventEnd <= 0) return null
    return entry.loadEventEnd - entry.startTime
  } catch {
    return null
  }
}
