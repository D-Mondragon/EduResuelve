import { Scale } from 'lucide-react'
import type { FormalErrors } from '../../lib/formal'
import { regimeHelp, regimes, type FormalFormData } from '../../types/case'
import { Field, Input, Select, Textarea } from '../ui/Field'

/** Pautas de redacción objetiva del 8.2: se muestran junto a la descripción. */
export function ObjectiveGuide() {
  return (
    // Dentro de la ayuda del campo (un <p>): solo elementos en línea
    <span className="mt-1 block space-y-0.5">
      <span className="block">• Describe lo que se vio y se oyó, en orden cronológico.</span>
      <span className="block">• Sin calificativos (“agresivo”, “problemático”), diagnósticos ni conclusiones sobre quién es responsable.</span>
      <span className="block">• Usa “estudiante involucrado” o “estudiante afectado”; no “agresor” ni “víctima”.</span>
    </span>
  )
}

/**
 * Campos del registro formal: régimen, hora del hecho, acciones inmediatas y declaración de objetividad.
 * prefix evita ids repetidos cuando el formulario aparece dentro de otra página.
 */
export function FormalFields({
  values,
  errors,
  onChange,
  prefix = 'formal',
}: {
  values: FormalFormData
  errors: FormalErrors
  onChange: (next: FormalFormData, key: keyof FormalFormData) => void
  prefix?: string
}) {
  const set = <K extends keyof FormalFormData>(key: K, value: FormalFormData[K]) => onChange({ ...values, [key]: value }, key)
  return (
    <fieldset className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
      <legend className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
        <Scale aria-hidden="true" className="size-4 text-emerald-700 dark:text-emerald-400" />
        Registro formal del incidente
        <span className="font-normal text-muted">(D.S. 021-2026-MINEDU, 8.2)</span>
      </legend>
      <Field
        error={errors.regime}
        hint={values.regime ? regimeHelp[values.regime] : 'Define qué normas se aplican al caso.'}
        id={`${prefix}-regime`}
        label="Régimen aplicable"
        required
      >
        <Select onChange={(e) => set('regime', e.target.value as FormalFormData['regime'])} value={values.regime}>
          <option value="">Selecciona el régimen</option>
          {regimes.map((regime) => (
            <option key={regime} value={regime}>
              {regime === 'Ninguno' ? 'Ninguno (no es un caso de convivencia)' : regime}
            </option>
          ))}
        </Select>
      </Field>
      <Field error={errors.incidentTime} hint="Hora aproximada en que ocurrió el hecho." id={`${prefix}-incidentTime`} label="Hora del hecho" required>
        <Input onChange={(e) => set('incidentTime', e.target.value)} type="time" value={values.incidentTime} />
      </Field>
      <Field
        className="md:col-span-2"
        counter={[values.immediateActions.length, 1000]}
        error={errors.immediateActions}
        hint="Lo que se hizo en el momento: separar a los estudiantes, brindar primeros auxilios, avisar a la familia…"
        id={`${prefix}-immediateActions`}
        label="Acciones inmediatas"
        required
      >
        <Textarea maxLength={1000} onChange={(e) => set('immediateActions', e.target.value)} value={values.immediateActions} />
      </Field>
      <div className="md:col-span-2">
        <label className="flex items-start gap-3 text-sm text-ink-2" htmlFor={`${prefix}-objective`}>
          <input
            aria-describedby={errors.objective ? `${prefix}-objective-error` : undefined}
            aria-invalid={errors.objective ? true : undefined}
            checked={values.objective}
            className="mt-0.5 size-4 shrink-0 accent-emerald-700"
            id={`${prefix}-objective`}
            onChange={(e) => set('objective', e.target.checked)}
            type="checkbox"
          />
          <span>
            Declaro que describí los hechos de forma objetiva, sin calificativos, diagnósticos ni conclusiones sobre
            responsabilidad.
          </span>
        </label>
        {errors.objective && (
          <p className="mt-1.5 text-sm text-rose-700 dark:text-rose-400" id={`${prefix}-objective-error`}>
            {errors.objective}
          </p>
        )}
      </div>
    </fieldset>
  )
}
