import { Bell, BellOff, CheckCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useDismiss } from '../hooks/useDismiss'
import { api } from '../lib/api'
import { formatRelative } from '../lib/format'
import { cn } from '../lib/ui'
import type { AppNotification, NotificationList } from '../types/audit'

const POLL_MS = 30_000

export function NotificationBell() {
  const [data, setData] = useState<NotificationList>({ unread: 0, items: [] })
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false))

  const refresh = useCallback(() => {
    api
      .listNotifications()
      .then(setData)
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, POLL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  function toggle() {
    if (!open) refresh()
    setOpen((value) => !value)
  }

  async function openNotification(item: AppNotification) {
    setOpen(false)
    if (!item.read) {
      setData((current) => ({
        unread: Math.max(0, current.unread - 1),
        items: current.items.map((n) => (n.id === item.id ? { ...n, read: true } : n)),
      }))
      api.markNotificationsRead([item.id]).catch(() => undefined)
    }
    if (item.incidentCode) navigate(`/incidencias/${encodeURIComponent(item.incidentCode)}`)
  }

  async function markAll() {
    setData((current) => ({ unread: 0, items: current.items.map((n) => ({ ...n, read: true })) }))
    await api.markNotificationsRead().catch(() => undefined)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={data.unread > 0 ? `Notificaciones: ${data.unread} sin leer` : 'Notificaciones'}
        className="relative rounded-lg p-2 text-ink-2 hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-emerald-600"
        onClick={toggle}
        type="button"
      >
        <Bell aria-hidden="true" className="size-5" />
        {data.unread > 0 && (
          <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-4 text-white">
            {data.unread > 9 ? '9+' : data.unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-40 rounded-xl border border-line bg-surface shadow-xl sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notificaciones</p>
            {data.unread > 0 && (
              <button
                className="inline-flex items-center gap-1 rounded text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                onClick={markAll}
                type="button"
              >
                <CheckCheck aria-hidden="true" className="size-4" />
                Marcar todas como leídas
              </button>
            )}
          </div>
          {data.items.length === 0 ? (
            <div className="flex flex-col items-center px-4 py-10 text-center text-sm text-muted">
              <BellOff aria-hidden="true" className="mb-2 size-6" />
              No tienes notificaciones.
            </div>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
              {data.items.map((item) => (
                <li key={item.id}>
                  <button
                    className={cn(
                      'flex w-full gap-3 px-4 py-3 text-left hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none',
                      !item.read && 'bg-emerald-50/60 dark:bg-emerald-400/5',
                    )}
                    onClick={() => openNotification(item)}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={cn('mt-1.5 size-2 shrink-0 rounded-full', item.read ? 'bg-transparent' : 'bg-emerald-500')}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">{item.title}</span>
                      <span className="mt-0.5 block truncate text-sm text-muted">{item.body}</span>
                      <span className="mt-1 block text-xs text-muted">{formatRelative(item.createdAt)}</span>
                    </span>
                    {!item.read && <span className="sr-only">(sin leer)</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
