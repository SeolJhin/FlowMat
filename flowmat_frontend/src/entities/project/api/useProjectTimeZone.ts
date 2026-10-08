import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'
export interface ProjectTimeZone { projectId: string; timeZone: string; version: number }
export interface TimeZoneCommand { timeZone: string; expectedVersion: number }
const businessPrefixes = new Set(['equipment-schedule', 'equipment-availability', 'equipment-load', 'work-order-plan', 'lots', 'stock-alerts', 'reorder-list', 'work-order-readiness', 'bom-revisions-at'])
function read(envelope: ApiEnvelope<ProjectTimeZone>, projectId: string) {
  return valid(envelope.success ? envelope.data as ProjectTimeZone : unwrapApiResponse(envelope), projectId)
}
function valid(data: ProjectTimeZone, projectId: string): ProjectTimeZone {
  if (!data || data.projectId !== projectId || typeof data.timeZone !== 'string' || !data.timeZone || data.timeZone.length > 100 || !Number.isSafeInteger(data.version) || data.version < 0)
    throw new Error('Project time zone response is invalid.')
  return data
}
export function useProjectTimeZone(projectId: string) {
  const client = useQueryClient(), key = ['project-time-zone', projectId]
  const path = `/projects/${encodeURIComponent(projectId)}/time-zone`
  const query = useQuery({ queryKey: key, enabled: Boolean(projectId), retry: false,
    queryFn: async () => read(await httpClient.get<ApiEnvelope<ProjectTimeZone>>(path), projectId) })
  const save = useMutation({ retry: false,
    mutationFn: async (input: TimeZoneCommand) => {
      const result = read(await httpClient.put<ApiEnvelope<ProjectTimeZone>>(path, input), projectId)
      if (result.timeZone !== input.timeZone || result.version !== input.expectedVersion + 1)
        throw new Error('Project time zone response is invalid. Retry the same save to recover its result.')
      return result
    },
    onSuccess: async (result) => {
      await client.cancelQueries({ queryKey: key })
      client.setQueryData(key, result)
      await client.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'project-time-zone' && (q.queryKey.includes(projectId) || businessPrefixes.has(String(q.queryKey[0]))) })
    },
  })
  return { query, save }
}
