const TIME_ZONE = 'America/Lima'

const dateTimeFormatter = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: TIME_ZONE,
})

const dateFormatter = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

const longDateFormatter = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'long',
  timeZone: 'UTC',
})

const relativeFormatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

/** Fecha y hora de un instante (timestamp), mostrada en hora de Lima. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date)
}

/** Fecha calendario (YYYY-MM-DD), sin conversión de zona horaria. */
export function formatDate(value: string | null | undefined, style: 'medium' | 'long' = 'medium'): string {
  if (!value) return '—'
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return '—'
  return (style === 'long' ? longDateFormatter : dateFormatter).format(date)
}

export function formatRelative(value: string, now: Date = new Date()): string {
  const diffSeconds = Math.round((new Date(value).getTime() - now.getTime()) / 1000)
  const abs = Math.abs(diffSeconds)
  if (abs < 60) return relativeFormatter.format(diffSeconds, 'second')
  if (abs < 3600) return relativeFormatter.format(Math.round(diffSeconds / 60), 'minute')
  if (abs < 86400) return relativeFormatter.format(Math.round(diffSeconds / 3600), 'hour')
  if (abs < 86400 * 30) return relativeFormatter.format(Math.round(diffSeconds / 86400), 'day')
  return formatDateTime(value)
}

/** Fecha de hoy en Lima en formato YYYY-MM-DD (para inputs type="date"). */
export function todayInLima(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now)
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}
