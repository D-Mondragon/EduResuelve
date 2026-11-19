import { HeartHandshake } from 'lucide-react'
import { useEffect, useState } from 'react'
import { HELP_LINES, pickCounselorMessage, type CounselorAudience } from '../lib/counselor'

const LAST_KEY = 'eduresuelve.consejo'

function lastShown(): string | undefined {
  try {
    return localStorage.getItem(LAST_KEY) ?? undefined
  } catch {
    return undefined
  }
}

/* Mascota consejera que "habla" en una burbuja de diálogo con un mensaje del mes. */
export function CounselorCard({ audience }: { audience: CounselorAudience }) {
  // Al azar en cada visita, sin repetir el último mensaje mostrado
  const [{ tag, message }] = useState(() => pickCounselorMessage(audience, new Date(), Math.random, lastShown()))
  const help = message.help && HELP_LINES[message.help][audience]

  useEffect(() => {
    try {
      localStorage.setItem(LAST_KEY, message.text)
    } catch {
      /* sin almacenamiento: solo se pierde el "no repetir" */
    }
  }, [message.text])

  return (
    <section aria-label="Consejo del mes" className="flex items-start gap-3 sm:gap-5">
      <img
        alt=""
        aria-hidden="true"
        className="h-28 w-auto shrink-0 sm:h-40"
        height={280}
        src="/consejero.webp"
        width={196}
      />
      <figure className="relative mt-4 min-w-0 flex-1 rounded-2xl border border-orange-200 bg-surface p-4 shadow-sm sm:mt-8 sm:p-5 dark:border-orange-400/30">
        {/* Cola de la burbuja, apuntando a la boca del zorrito */}
        <span
          aria-hidden="true"
          className="absolute top-6 -left-[9px] size-4 rotate-45 border-b border-l border-orange-200 bg-surface dark:border-orange-400/30"
        />
        <figcaption className="text-sm font-semibold text-orange-800 dark:text-orange-300">{tag}</figcaption>
        <blockquote className="mt-1.5 text-sm leading-relaxed text-ink sm:text-[0.95rem]">{message.text}</blockquote>
        {help && (
          <p className="mt-3 flex items-start gap-2.5 rounded-xl bg-orange-50 p-3 text-sm text-ink-2 dark:bg-orange-400/10">
            <HeartHandshake aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-orange-600 dark:text-orange-300" />
            <span>
              {help.lead} <strong className="font-semibold text-ink">{help.line}</strong>. {help.detail}
            </span>
          </p>
        )}
      </figure>
    </section>
  )
}
