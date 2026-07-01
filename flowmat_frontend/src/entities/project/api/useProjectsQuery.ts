import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProjectSummaryDto } from '../../../shared/types/api'

async function fetchProjects(): Promise<ProjectSummaryDto[]> {
  const envelope = await httpClient.get<ApiEnvelope<ProjectSummaryDto[]>>('/projects')
  return unwrapApiResponse(envelope)
}

export function useProjectsQuery() {
  return useQuery<ProjectSummaryDto[]>({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  })
}
