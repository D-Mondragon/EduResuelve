import {
  CheckCircle2,
  CircleDashed,
  CircleSlash,
  Eye,
  Hammer,
  Lock,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'
import type { IncidentPriority, IncidentStatus } from '../types/incident'
import type { UserRole } from '../types/user'

export const statusStyles: Record<IncidentStatus, string> = {
  Nuevo: 'bg-sky-50 text-sky-800 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/30',
  'En revisión': 'bg-blue-50 text-blue-800 ring-blue-600/20 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/30',
  Asignado: 'bg-indigo-50 text-indigo-800 ring-indigo-600/20 dark:bg-indigo-400/10 dark:text-indigo-300 dark:ring-indigo-400/30',
  'En atención': 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/30',
  Resuelto: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/30',
  Cerrado: 'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/30',
  Descartado: 'bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/30',
}

/** Color sólido para barras y puntos de cada estado. */
export const statusBar: Record<IncidentStatus, string> = {
  Nuevo: 'bg-sky-500',
  'En revisión': 'bg-blue-500',
  Asignado: 'bg-indigo-500',
  'En atención': 'bg-amber-500',
  Resuelto: 'bg-emerald-500',
  Cerrado: 'bg-slate-400',
  Descartado: 'bg-rose-400',
}

export const statusIcons: Record<IncidentStatus, LucideIcon> = {
  Nuevo: CircleDashed,
  'En revisión': Eye,
  Asignado: UserCheck,
  'En atención': Hammer,
  Resuelto: CheckCircle2,
  Cerrado: Lock,
  Descartado: CircleSlash,
}

export const priorityStyles: Record<IncidentPriority, string> = {
  Baja: 'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-400/10 dark:text-slate-300 dark:ring-slate-400/30',
  Media: 'bg-blue-50 text-blue-800 ring-blue-600/20 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/30',
  Alta: 'bg-orange-50 text-orange-800 ring-orange-600/20 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/30',
  Crítica: 'bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/30',
}

export const priorityBar: Record<IncidentPriority, string> = {
  Baja: 'bg-slate-400',
  Media: 'bg-blue-500',
  Alta: 'bg-orange-500',
  Crítica: 'bg-rose-500',
}

export const roleStyles: Record<UserRole, string> = {
  Estudiante: 'bg-sky-50 text-sky-800 ring-sky-600/20 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/30',
  Docente: 'bg-violet-50 text-violet-800 ring-violet-600/20 dark:bg-violet-400/10 dark:text-violet-300 dark:ring-violet-400/30',
  Orientador: 'bg-teal-50 text-teal-800 ring-teal-600/20 dark:bg-teal-400/10 dark:text-teal-300 dark:ring-teal-400/30',
  Administrador: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/30',
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
