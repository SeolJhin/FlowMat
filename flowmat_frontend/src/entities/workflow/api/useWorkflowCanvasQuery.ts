import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import { toWorkflowCanvasViewModel } from '../model/toWorkflowCanvasViewModel'
import type { ApiEnvelope, WorkflowCanvasDto } from '../../../shared/types/api'
import type { WorkflowCanvasViewModel } from '../model/types'

async function fetchWorkflowCanvas(workflowId: string): Promise<WorkflowCanvasViewModel> {
  const envelope = await httpClient.get<ApiEnvelope<WorkflowCanvasDto>>(
    `/workflows/${workflowId}/canvas`
  )
  const dto = unwrapApiResponse(envelope)
  return toWorkflowCanvasViewModel(dto)
}

export function useWorkflowCanvasQuery(workflowId: string) {
  return useQuery<WorkflowCanvasViewModel>({
    queryKey: ['workflow-canvas', workflowId],
    queryFn: () => fetchWorkflowCanvas(workflowId),
    enabled: Boolean(workflowId),
  })
}
