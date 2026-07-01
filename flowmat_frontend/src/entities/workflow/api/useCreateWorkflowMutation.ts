import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, WorkflowDto } from '../../../shared/types/api'

export interface CreateWorkflowInput {
  projectId: string
  workflowName: string
  workflowDesc?: string
  workflowType?: string
}

async function createWorkflow(input: CreateWorkflowInput): Promise<WorkflowDto> {
  const envelope = await httpClient.post<ApiEnvelope<WorkflowDto>>('/workflows', input)
  return unwrapApiResponse(envelope)
}

export function useCreateWorkflowMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createWorkflow,
    onSuccess: async (workflow) => {
      await queryClient.invalidateQueries({ queryKey: ['workflows', workflow.projectId] })
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
