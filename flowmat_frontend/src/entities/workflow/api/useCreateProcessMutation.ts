import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProcessDto } from '../../../shared/types/api'
import { patchWorkflowCanvasProcess } from '../model/workflowCanvasCache'

export interface CreateProcessInput {
  workflowId: string
  processName: string
  processType?: string
  nodeType?: string
  colorScheme?: string
  posX?: number
  posY?: number
  width?: number
  height?: number
  processDesc?: string
}

async function createProcess(input: CreateProcessInput): Promise<ProcessDto> {
  const envelope = await httpClient.post<ApiEnvelope<ProcessDto>>('/processes', input)
  return unwrapApiResponse(envelope)
}

export function useCreateProcessMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createProcess,
    onSuccess: (process) => {
      patchWorkflowCanvasProcess(queryClient, process)
    },
  })
}
