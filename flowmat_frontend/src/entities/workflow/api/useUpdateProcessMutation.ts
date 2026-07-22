import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProcessDto } from '../../../shared/types/api'
import type { UpdateProcessInput } from '../model/types'
import { patchWorkflowCanvasProcess } from '../model/workflowCanvasCache'

async function updateProcess(input: UpdateProcessInput): Promise<ProcessDto> {
  const { processId, ...payload } = input
  const envelope = await httpClient.put<ApiEnvelope<ProcessDto>>(`/processes/${processId}`, payload)
  return unwrapApiResponse(envelope)
}

export function useUpdateProcessMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProcess,
    onSuccess: (process) => {
      patchWorkflowCanvasProcess(queryClient, process)
    },
  })
}
