import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, WorkflowRevisionDetailDto, WorkflowRevisionDto } from '../../../shared/types/api'

async function fetchRevisions(workflowId: string): Promise<WorkflowRevisionDto[]> {
  const envelope = await httpClient.get<ApiEnvelope<WorkflowRevisionDto[]>>(
    `/workflows/${encodeURIComponent(workflowId)}/revisions`,
  )
  return unwrapApiResponse(envelope)
}

async function publishRevision(workflowId: string): Promise<WorkflowRevisionDetailDto> {
  const envelope = await httpClient.post<ApiEnvelope<WorkflowRevisionDetailDto>>(
    `/workflows/${encodeURIComponent(workflowId)}/revisions`, undefined,
  )
  return unwrapApiResponse(envelope)
}

export function useWorkflowRevisionsQuery(workflowId: string) {
  return useQuery({
    queryKey: ['workflow-revisions', workflowId],
    queryFn: () => fetchRevisions(workflowId),
    enabled: Boolean(workflowId),
  })
}

export function usePublishWorkflowRevisionMutation(workflowId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => publishRevision(workflowId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workflow-revisions', workflowId] })
    },
  })
}
