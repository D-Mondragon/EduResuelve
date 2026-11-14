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

/** Indicadores del panel de calidad, calculados por quality_stats. */
export interface PriorityResolution {
  priority: 'Crítica' | 'Alta' | 'Media' | 'Baja'
  targetHours: number
  resolved: number
  avgHoursToResolve: number | null
  medianHoursToResolve: number | null
  withinTargetPct: number | null
  closed: number
  avgHoursToClose: number | null
  medianHoursToClose: number | null
  open: number
  overdueOpen: number
  overdueCodes: string[]
}

export interface DataQualityCheck {
  dimension: 'Integridad' | 'Consistencia' | 'Unicidad' | 'Actualización' | 'Completitud' | 'Cumplimiento normativo'
  check: string
  severity: 'error' | 'warning' | 'info'
  total: number
  affected: number
  okPct: number
  codes: string[]
}

export interface QualityStats {
  generatedAt: string
  totals: { incidents: number; open: number; resolved: number; closed: number; discarded: number }
  resolution: { withinTargetPct: number | null; byPriority: PriorityResolution[] }
  dataQuality: { score: number | null; checks: DataQualityCheck[] }
  satisfaction: {
    responses: number
    pending: number
    avgRating: number | null
    csatPct: number | null
    avgSpeed: number | null
    lowCount: number
    resolved: { Sí: number; Parcialmente: number; No: number }
    ratingDistribution: { rating: number; count: number }[]
  }
}
