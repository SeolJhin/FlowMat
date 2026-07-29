import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'
import type { PresenceMessage } from './useWorkflowSync'

export async function fetchWorkflowPresenceSnapshot(workflowId: string) {
  const envelope = await httpClient.get<ApiEnvelope<PresenceMessage[]>>(`/workflows/${workflowId}/presence`)
  return unwrapApiResponse(envelope)
}
