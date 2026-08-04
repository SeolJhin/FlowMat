import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, WorkflowGraphChangesDto } from '../../../shared/types/api'

export async function fetchWorkflowGraphChanges(workflowId: string, sinceSeq: number) {
  const envelope = await httpClient.get<ApiEnvelope<WorkflowGraphChangesDto>>(
    `/workflows/${workflowId}/graph-changes?sinceSeq=${encodeURIComponent(sinceSeq)}`
  )
  return unwrapApiResponse(envelope)
}
