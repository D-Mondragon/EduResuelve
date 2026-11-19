import { FilePlus2, LifeBuoy, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { HELP_LINES, MONTH_THEMES, pickCounselorMessage, type CounselorAudience } from '../lib/counselor'
import { Button, ButtonLink } from './ui/Button'

/* Mascota consejera con un mensaje del mes sobre convivencia, acoso y salud mental. */
export function CounselorCard({ audience }: { audience: CounselorAudience }) {
  const [pick, setPick] = useState(() => pickCounselorMessage(audience))
  const pool = MONTH_THEMES[new Date().getMonth()][audience]
  const { message, tag } = pick

  function next() {
    const index = (pick.index + 1) % pool.length
    setPick({ ...pick, index, message: pool[index] })
  }

  return (
    <section
      aria-label="Mensaje del mes"
      className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-orange-200 bg-orange-50/70 p-4 sm:gap-6 sm:p-5 dark:border-orange-400/20 dark:bg-orange-400/5"
    >
      <img
        alt=""
        aria-hidden="true"
        className="hidden h-36 w-auto shrink-0 self-end sm:block"
        height={280}
        src="/consejero.webp"
        width={196}
      />
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-xs font-semibold text-orange-800 dark:text-orange-300">{tag}</p>
        <div className="flex items-start gap-3">
          <img alt="" aria-hidden="true" className="h-16 w-auto shrink-0 sm:hidden" height={280} src="/consejero.webp" width={196} />
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-ink">{message.title}</h2>
            <p aria-live="polite" className="text-sm text-ink-2">
              {message.text}
            </p>
          </div>
        </div>
        {message.help && (
          <p className="flex items-start gap-2 text-sm font-medium text-ink">
            <LifeBuoy aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-orange-700 dark:text-orange-300" />
            {HELP_LINES[message.help]}
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <ButtonLink icon={FilePlus2} size="sm" to="/incidencias/nueva">
            {audience === 'Estudiante' ? 'Reportar un caso' : 'Registrar un caso'}
          </ButtonLink>
          {pool.length > 1 && (
            <Button icon={RefreshCw} onClick={next} size="sm" variant="ghost">
              Otro mensaje
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
