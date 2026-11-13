import type { Acta, ActaVerification } from '../types/acta'
import type { PerfStats, QualityStats } from '../types/quality'
import type { ReportRow } from '../types/report'
import type { AuditLog, NotificationList } from '../types/audit'
import type {
  IncidentDetail,
  IncidentFormData,
  IncidentSummary,
  ResolutionFormData,
  SurveyFormData,
  SurveyResponse,
  TransitionAction,
} from '../types/incident'
import type { ManagedUser, User, UserFormData, UserRef, UserStatus } from '../types/user'
import { currentDevice, pageLoadMs, PerfBuffer, type PerfSample } from './perf'

const TOKEN_KEY = 'eduresuelve.session'

export const UNAUTHORIZED_EVENT = 'eduresuelve:unauthorized'

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Almacenamiento no disponible (modo privado): la sesión dura mientras la pestaña esté abierta.
  }
}

function config() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!url || !key) {
    throw new ApiError(
      'La aplicación no está configurada. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.',
      0,
      'CONFIG',
    )
  }
  return { url: url.replace(/\/$/, ''), key }
}

/* ---------------------------------------------------------------------------
 * Medición de tiempos de respuesta (RNF-001). Se desactiva con VITE_PERF_LOG=false.
 * ------------------------------------------------------------------------- */
const perfEnabled = import.meta.env.VITE_PERF_LOG !== 'false'
const PERF_FN = 'log_perf'

const perf = new PerfBuffer(
  (samples: PerfSample[]) =>
    rpc(PERF_FN, { p_token: getToken() ?? '', p_samples: samples }, {
      // Al cerrar u ocultar la pestaña, keepalive permite que el envío termine
      keepalive: typeof document !== 'undefined' && document.visibilityState === 'hidden',
    }),
  { canSend: () => getToken() !== null },
)

function recordTiming(fn: string, startedAt: number, ok: boolean) {
  if (!perfEnabled || fn === PERF_FN) return
  perf.add({ fn, ms: performance.now() - startedAt, ok, device: currentDevice() })
}

/** Envía las mediciones pendientes (por ejemplo, antes de cerrar sesión). */
export function flushPerformance() {
  return perf.flush()
}

let perfStarted = false

/** Inicia el envío periódico de mediciones y registra el tiempo de carga de la página. */
export function startPerformanceReporting() {
  if (!perfEnabled || perfStarted || typeof window === 'undefined') return
  perfStarted = true
  window.setInterval(() => void perf.flush(), 30_000)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void perf.flush()
  })
  const recordLoad = () => {
    // loadEventEnd se completa justo después del evento load
    window.setTimeout(() => {
      const ms = pageLoadMs()
      if (ms !== null) perf.add({ fn: 'carga_pagina', ms, ok: true, device: currentDevice() })
    }, 0)
  }
  if (document.readyState === 'complete') recordLoad()
  else window.addEventListener('load', recordLoad, { once: true })
}

/** Llama a una función RPC de Supabase (PostgREST) con argumentos nombrados. */
export async function rpc<T>(
  fn: string,
  args: Record<string, unknown> = {},
  options: { keepalive?: boolean } = {},
): Promise<T> {
  const { url, key } = config()
  const headers: Record<string, string> = { 'Content-Type': 'application/json', apikey: key }
  // Las claves "anon" heredadas son JWT; las nuevas "publishable" solo van en apikey.
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`

  const startedAt = performance.now()
  let response: Response
  try {
    response = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(args),
      keepalive: options.keepalive,
    })
  } catch {
    recordTiming(fn, startedAt, false)
    throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión a internet.', 0, 'NETWORK')
  }

  const text = await response.text()
  recordTiming(fn, startedAt, response.ok)
  const body: unknown = text ? JSON.parse(text) : null

  if (!response.ok) {
    const error = (body ?? {}) as { message?: string; code?: string }
    const apiError = new ApiError(
      error.message ?? 'Ocurrió un error inesperado. Intenta nuevamente.',
      response.status,
      error.code ?? String(response.status),
    )
    if (response.status === 401) {
      setToken(null)
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: apiError.message }))
    }
    throw apiError
  }
  return body as T
}

function authed<T>(fn: string, args: Record<string, unknown> = {}) {
  return rpc<T>(fn, { p_token: getToken() ?? '', ...args })
}

export const api = {
  // Autenticación
  login: (dni: string, password: string) =>
    rpc<{ token?: string; user?: User; error?: string }>('login', { p_dni: dni, p_password: password }),
  logout: () => authed<null>('logout'),
  me: () => authed<User>('me'),
  changePassword: (current: string, next: string) =>
    authed<User>('change_password', { p_current: current, p_new: next }),

  // Incidencias
  listIncidents: () => authed<IncidentSummary[]>('list_incidents'),
  getIncident: (code: string) => authed<IncidentDetail>('get_incident', { p_code: code }),
  createIncident: (data: IncidentFormData) => authed<{ code: string }>('create_incident', { p_data: data }),
  updateIncident: (code: string, data: IncidentFormData) =>
    authed<{ code: string }>('update_incident', { p_code: code, p_data: data }),
  transition: (
    code: string,
    action: TransitionAction,
    payload: { observation?: string; reason?: string; responsibleId?: string | null },
  ) =>
    authed<{ code: string; status: string }>('transition_incident', {
      p_code: code,
      p_action: action,
      p_observation: payload.observation ?? '',
      p_reason: payload.reason ?? '',
      p_responsible: payload.responsibleId ?? null,
    }),
  reassign: (code: string, responsibleId: string, reason: string) =>
    authed<{ code: string }>('reassign_incident', { p_code: code, p_responsible: responsibleId, p_reason: reason }),
  addObservation: (code: string, observation: string) =>
    authed<{ code: string }>('add_observation', { p_code: code, p_observation: observation }),
  resolve: (code: string, data: ResolutionFormData) =>
    authed<{ code: string }>('resolve_incident', { p_code: code, p_data: data }),
  close: (code: string, observations: string, confirm: boolean) =>
    authed<{ code: string }>('close_incident', { p_code: code, p_observations: observations, p_confirm: confirm }),
  assignableUsers: () => authed<UserRef[]>('list_assignable_users'),

  // Evidencias
  evidenceBegin: (code: string, meta: Record<string, unknown>) =>
    authed<{ id: number }>('evidence_begin', { p_code: code, p_meta: meta }),
  evidenceChunk: (id: number, idx: number, data: string) =>
    authed<null>('evidence_chunk', { p_id: id, p_idx: idx, p_data: data }),
  evidenceFinish: (id: number) => authed<{ id: number; sizeBytes: number }>('evidence_finish', { p_id: id }),
  evidenceChunkGet: (id: number, idx: number) => authed<string>('evidence_chunk_get', { p_id: id, p_idx: idx }),
  evidenceVoid: (id: number, reason: string) => authed<{ id: number }>('evidence_void', { p_id: id, p_reason: reason }),

  // Encuesta de satisfacción (RN-012)
  submitSurvey: (code: string, data: SurveyFormData) =>
    authed<SurveyResponse>('submit_survey', { p_code: code, p_data: data }),

  // Actas de resolución (RN-011)
  getActa: (number: string) => authed<Acta>('get_acta', { p_number: number }),
  /** Verificación pública: no requiere sesión. */
  verifyActa: (code: string) => rpc<ActaVerification>('verify_acta', { p_code: code }),

  // Usuarios
  listUsers: () => authed<ManagedUser[]>('list_users'),
  createUser: (data: UserFormData) => authed<User>('create_user', { p_data: data }),
  updateUser: (id: string, data: UserFormData) => authed<User>('update_user', { p_id: id, p_data: data }),
  setUserStatus: (id: string, status: UserStatus) =>
    authed<User & { pendingReassignments: number }>('set_user_status', { p_id: id, p_status: status }),
  resetPassword: (id: string, password: string) =>
    authed<User>('reset_user_password', { p_id: id, p_new_password: password }),

  // Métricas de calidad
  perfStats: (days = 30) => authed<PerfStats>('perf_stats', { p_days: days }),
  qualityStats: () => authed<QualityStats>('quality_stats'),
  reportIncidents: (from: string | null, to: string | null) =>
    authed<ReportRow[]>('report_incidents', { p_from: from || null, p_to: to || null }),

  // Auditoría y notificaciones
  listAudit: () => authed<AuditLog[]>('list_audit'),
  listNotifications: () => authed<NotificationList>('list_notifications'),
  markNotificationsRead: (ids?: number[]) =>
    authed<null>('mark_notifications_read', { p_ids: ids ?? null }),
}
