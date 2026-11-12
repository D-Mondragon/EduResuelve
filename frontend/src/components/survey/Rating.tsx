import { Star } from 'lucide-react'
import { cn } from '../../lib/ui'

/**
 * Calificación de 1 a 5 con estrellas. Es un grupo de botones de opción nativos:
 * funciona con flechas del teclado y los lectores de pantalla anuncian "3 de 5: Neutral".
 */
export function RatingInput({
  name,
  legend,
  value,
  onChange,
  labels,
  error,
}: {
  name: string
  legend: string
  value: number | null
  onChange: (value: number) => void
  labels: readonly string[]
  error?: string
}) {
  const errorId = `${name}-error`
  return (
    <fieldset aria-describedby={error ? errorId : undefined} aria-invalid={error ? true : undefined}>
      <legend className="text-sm font-medium text-ink-2">
        {legend} <span className="text-rose-600">*</span>
      </legend>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex gap-1">
          {labels.map((label, index) => {
            const score = index + 1
            const active = value !== null && score <= value
            return (
              <label className="cursor-pointer" key={label}>
                <input
                  aria-label={`${score} de 5: ${label}`}
                  checked={value === score}
                  className="peer sr-only"
                  name={name}
                  onChange={() => onChange(score)}
                  type="radio"
                  value={score}
                />
                <Star
                  aria-hidden="true"
                  className={cn(
                    'size-9 rounded-md p-0.5 transition peer-focus-visible:outline-2 peer-focus-visible:outline-emerald-600 sm:size-10',
                    active ? 'fill-amber-400 text-amber-500' : 'text-slate-300 hover:text-amber-400 dark:text-slate-600',
                  )}
                />
              </label>
            )
          })}
        </div>
        <span aria-live="polite" className="min-h-5 text-sm font-medium text-ink-2">
          {value ? labels[value - 1] : 'Selecciona una calificación'}
        </span>
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-rose-700 dark:text-rose-400" id={errorId}>
          {error}
        </p>
      )}
    </fieldset>
  )
}

/** Estrellas de solo lectura con texto equivalente (no depende solo de lo visual). */
export function RatingStars({ value, label }: { value: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="flex">
        {[1, 2, 3, 4, 5].map((score) => (
          <Star
            className={cn('size-4', score <= value ? 'fill-amber-400 text-amber-500' : 'text-slate-300 dark:text-slate-600')}
            key={score}
          />
        ))}
      </span>
      <span className="text-sm text-ink">
        {value}/5{label ? ` · ${label}` : ''}
      </span>
    </span>
  )
}
