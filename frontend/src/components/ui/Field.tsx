import { AlertCircle } from 'lucide-react'
import {
  cloneElement,
  isValidElement,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '../../lib/ui'

export const controlClass =
  'block w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base text-ink shadow-sm outline-none transition placeholder:text-muted focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/25 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted aria-invalid:border-rose-500 aria-invalid:focus:ring-rose-500/25 sm:text-sm'

interface FieldProps {
  id: string
  label: string
  required?: boolean
  hint?: ReactNode
  error?: string
  className?: string
  /** contador de caracteres: [actual, máximo] */
  counter?: [number, number]
  /** elementos junto al control (p. ej. botones) */
  addon?: ReactNode
  children: ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean; required?: boolean }>
}

/** Envuelve un control con etiqueta, ayuda, error y atributos ARIA enlazados. */
export function Field({ id, label, required, hint, error, className, counter, addon, children }: FieldProps) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        required,
      })
    : children

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <label className="block text-sm font-medium text-ink-2" htmlFor={id}>
          {label}
          {required && (
            <span className="text-rose-600 dark:text-rose-400" aria-hidden="true">
              {' '}*
            </span>
          )}
        </label>
        {counter && (
          <span className={cn('text-xs tabular-nums', counter[0] > counter[1] ? 'text-rose-600' : 'text-muted')}>
            {counter[0]}/{counter[1]}
          </span>
        )}
      </div>
      {addon ? (
        <div className="mt-1.5 flex gap-2">
          <div className="min-w-0 flex-1">{control}</div>
          {addon}
        </div>
      ) : (
        <div className="mt-1.5">{control}</div>
      )}
      {hint && (
        <p className="mt-1.5 text-xs leading-5 text-muted" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="mt-1.5 flex items-start gap-1.5 text-sm text-rose-700 dark:text-rose-400" id={`${id}-error`}>
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClass, className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClass, 'min-h-24 resize-y leading-6', className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlClass, 'pr-8', className)} {...props}>
      {children}
    </select>
  )
}
