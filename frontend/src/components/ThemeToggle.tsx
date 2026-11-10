import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemePreference } from '../lib/theme'
import { cn } from '../lib/ui'

const options: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
]

export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme()
  return (
    <div
      aria-label="Tema de la interfaz"
      className={cn('inline-flex rounded-lg border border-line bg-surface-2 p-0.5', className)}
      role="radiogroup"
    >
      {options.map(({ value, label, icon: Icon }) => (
        <button
          aria-checked={preference === value}
          className={cn(
            'inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
            preference === value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
          key={value}
          onClick={() => setPreference(value)}
          role="radio"
          title={`Tema ${label.toLowerCase()}`}
          type="button"
        >
          <Icon aria-hidden="true" className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}
