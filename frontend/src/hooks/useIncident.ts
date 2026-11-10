import { useCallback } from 'react'
import { useParams } from 'react-router'
import { api } from '../lib/api'
import { useAsync } from './useAsync'

/** Carga la incidencia indicada en la URL (/incidencias/:code/...). */
export function useIncident() {
  const { code = '' } = useParams()
  const load = useCallback(() => api.getIncident(code), [code])
  return { code, ...useAsync(load) }
}
