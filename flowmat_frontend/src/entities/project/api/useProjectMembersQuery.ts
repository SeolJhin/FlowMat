import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProjectMemberDto } from '../../../shared/types/api'

async function fetchMembers(projectId: string): Promise<ProjectMemberDto[]> {
  const envelope = await httpClient.get<ApiEnvelope<ProjectMemberDto[]>>(
    `/project-members?projectId=${encodeURIComponent(projectId)}`
  )
  return unwrapApiResponse(envelope)
}

export function useProjectMembersQuery(projectId: string) {
  return useQuery<ProjectMemberDto[]>({
    queryKey: ['project-members', projectId],
    queryFn: () => fetchMembers(projectId),
    enabled: !!projectId,
  })
}
