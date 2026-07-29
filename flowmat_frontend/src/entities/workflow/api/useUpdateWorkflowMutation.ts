import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, WorkflowDto } from '../../../shared/types/api'
import { patchWorkflowCanvasWorkflow } from '../model/workflowCanvasCache'

interface UpdateWorkflowInput {
  workflowId: string
  workflowName?: string
  workflowDesc?: string
}

async function updateWorkflow(input: UpdateWorkflowInput): Promise<WorkflowDto> {
  const { workflowId, ...payload } = input
  const envelope = await httpClient.put<ApiEnvelope<WorkflowDto>>(`/workflows/${workflowId}`, payload)
  return unwrapApiResponse(envelope)
}

export function useUpdateWorkflowMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateWorkflow,
    onSuccess: async (workflow) => {
      patchWorkflowCanvasWorkflow(queryClient, workflow)
      await queryClient.invalidateQueries({ queryKey: ['workflows', workflow.projectId] })
    },
  })
}
