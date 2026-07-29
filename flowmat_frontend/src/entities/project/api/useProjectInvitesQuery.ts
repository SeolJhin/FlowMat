import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProjectInviteDto } from '../../../shared/types/api'

async function fetchInvites(projectId: string): Promise<ProjectInviteDto[]> {
  const envelope = await httpClient.get<ApiEnvelope<ProjectInviteDto[]>>(
    `/project-invites?projectId=${encodeURIComponent(projectId)}`
  )
  return unwrapApiResponse(envelope)
}

export function useProjectInvitesQuery(projectId: string) {
  return useQuery<ProjectInviteDto[]>({
    queryKey: ['project-invites', projectId],
    queryFn: () => fetchInvites(projectId),
    enabled: !!projectId,
  })
}
