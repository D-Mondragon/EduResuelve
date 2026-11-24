import { LogOut, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/authContext'
import { api } from '../lib/api'
import {
  IDLE_MESSAGE,
  IDLE_PING_MS,
  idlePhase,
  readLastActivity,
  secondsLeft,
  writeLastActivity,
  type IdlePhase,
} from '../lib/idle'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove', 'scroll'] as const
/** Guardar la actividad como mucho cada 5 s (mousemove dispara muchas veces). */
const WRITE_EVERY_MS = 5_000

/**
 * Vigila la inactividad mientras hay sesión: avisa a los 28 min y cierra a los 30.
 * La actividad de cualquier pestaña del mismo navegador cuenta para todas.
 */
export function IdleLogout() {
  const { logout } = useAuth()
  const [{ phase, seconds }, setStatus] = useState<{ phase: IdlePhase; seconds: number }>({ phase: 'active', seconds: 0 })
  // Se inicializan en el efecto (no se lee el reloj durante el render)
  const last = useRef(0)
  const lastWrite = useRef(0)
  const lastPing = useRef(0)
  const phaseRef = useRef<IdlePhase>('active')

  const markActive = useCallback((force = false) => {
    // Durante el aviso, solo el botón "Seguir conectado" mantiene la sesión
    if (phaseRef.current !== 'active' && !force) return
    const time = Date.now()
    last.current = time
    if (force || time - lastWrite.current > WRITE_EVERY_MS) {
      lastWrite.current = time
      writeLastActivity(time)
    }
    if (force || time - lastPing.current > IDLE_PING_MS) {
      lastPing.current = time
      void api.me().catch(() => undefined) // un 401 ya lo atiende la capa de API
    }
  }, [])

  useEffect(() => {
    const start = Date.now()
    // Si nunca se registró actividad (p. ej., sin almacenamiento), se empieza a contar ahora
    last.current = readLastActivity() ?? start
    lastPing.current = start
    if (readLastActivity() === null) writeLastActivity(start)
    const onActivity = () => markActive()
    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, onActivity, { passive: true, capture: true })

    const tick = () => {
      const time = Date.now()
      // Otra pestaña pudo registrar actividad más reciente
      const shared = readLastActivity()
      if (shared !== null && shared > last.current) last.current = shared
      const next = idlePhase(time, last.current)
      const left = next === 'warning' ? secondsLeft(time, last.current) : 0
      // Solo se vuelve a dibujar si cambió algo (en uso normal, nunca)
      setStatus((current) => (current.phase === next && current.seconds === left ? current : { phase: next, seconds: left }))
      if (next === 'expired' && phaseRef.current !== 'expired') void logout(IDLE_MESSAGE)
      phaseRef.current = next
    }
    tick()
    const timer = window.setInterval(tick, 1_000)
    return () => {
      window.clearInterval(timer)
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, onActivity, { capture: true })
    }
  }, [logout, markActive])

  const stay = () => {
    phaseRef.current = 'active'
    setStatus({ phase: 'active', seconds: 0 })
    markActive(true)
  }

  return (
    <Modal
      description="Por seguridad, si nadie usa el sistema la sesión se cierra sola. Así nadie más puede ver tu información en una computadora compartida."
      footer={
        <>
          <Button icon={LogOut} onClick={() => void logout()} variant="secondary">
            Cerrar sesión
          </Button>
          <Button data-autofocus icon={ShieldCheck} onClick={stay}>
            Seguir conectado
          </Button>
        </>
      }
      onClose={stay}
      open={phase === 'warning'}
      title="¿Sigues ahí?"
    >
      <p className="text-sm">
        Tu sesión se cerrará en <strong className="tabular-nums">{seconds} segundos</strong> por inactividad.
      </p>
    </Modal>
  )
}
