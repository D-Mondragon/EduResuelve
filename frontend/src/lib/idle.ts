/**
 * Cierre de sesión por inactividad, pensado para computadoras compartidas (sala de cómputo).
 * El servidor rechaza la sesión a los 35 min sin actividad (app.session_idle_minutes);
 * el navegador avisa antes y cierra a los 30 min.
 */
export const IDLE_LOGOUT_MS = 30 * 60_000
export const IDLE_WARNING_MS = 28 * 60_000
/** Con actividad, se avisa al servidor como máximo cada 4 min (mantiene viva la sesión allá). */
export const IDLE_PING_MS = 4 * 60_000
export const IDLE_MESSAGE = 'Tu sesión se cerró por inactividad. Inicia sesión nuevamente.'

const ACTIVITY_KEY = 'eduresuelve.actividad'

export type IdlePhase = 'active' | 'warning' | 'expired'

export function idlePhase(now: number, lastActivity: number): IdlePhase {
  const idle = now - lastActivity
  if (idle >= IDLE_LOGOUT_MS) return 'expired'
  if (idle >= IDLE_WARNING_MS) return 'warning'
  return 'active'
}

/** Segundos que faltan para el cierre (para el aviso). */
export function secondsLeft(now: number, lastActivity: number): number {
  return Math.max(0, Math.ceil((lastActivity + IDLE_LOGOUT_MS - now) / 1000))
}

/** Última actividad compartida entre pestañas; null si no hay registro o el navegador lo impide. */
export function readLastActivity(): number | null {
  try {
    const value = Number(localStorage.getItem(ACTIVITY_KEY))
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

export function writeLastActivity(time: number): void {
  try {
    localStorage.setItem(ACTIVITY_KEY, String(time))
  } catch {
    // Sin almacenamiento (modo privado estricto): cada pestaña lleva su propia cuenta
  }
}
