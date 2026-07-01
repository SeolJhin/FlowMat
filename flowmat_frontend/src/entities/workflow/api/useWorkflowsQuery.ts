import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, WorkflowDto } from '../../../shared/types/api'

async function fetchWorkflows(projectId: string): Promise<WorkflowDto[]> {
  const envelope = await httpClient.get<ApiEnvelope<WorkflowDto[]>>(
    `/workflows?projectId=${encodeURIComponent(projectId)}`
  )
  return unwrapApiResponse(envelope)
}

export function useWorkflowsQuery(projectId: string) {
  return useQuery<WorkflowDto[]>({
    queryKey: ['workflows', projectId],
    queryFn: () => fetchWorkflows(projectId),
    enabled: Boolean(projectId),
  })
}
