import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProcessIoDto } from '../../../shared/types/api'
import type { UpdateProcessIoInput } from '../model/types'
import { patchWorkflowCanvasPort } from '../model/workflowCanvasCache'

async function updateProcessIo(input: UpdateProcessIoInput): Promise<ProcessIoDto> {
  const { processIoId, ...payload } = input
  const envelope = await httpClient.put<ApiEnvelope<ProcessIoDto>>(`/process-ios/${processIoId}`, payload)
  return unwrapApiResponse(envelope)
}

export function useUpdateProcessIoMutation(workflowId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProcessIo,
    onSuccess: (processIo) => {
      patchWorkflowCanvasPort(queryClient, workflowId, processIo)
    },
  })
}
