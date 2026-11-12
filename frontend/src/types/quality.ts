/** Estadísticas de tiempos de respuesta (RNF-001), calculadas por perf_stats. */
export interface PerfAggregate {
  count: number
  avgMs: number | null
  p50Ms: number | null
  p95Ms: number | null
  maxMs: number | null
  underThresholdPct: number | null
  errorPct: number | null
}

export interface PerfOperation extends PerfAggregate {
  operation: string
}

export interface PerfDevice {
  device: 'Escritorio' | 'Móvil'
  count: number
  avgMs: number
  p95Ms: number
  underThresholdPct: number
}

export interface PerfStats {
  days: number
  thresholdMs: number
  since: string
  overall: PerfAggregate
  byOperation: PerfOperation[]
  byDevice: PerfDevice[]
}
