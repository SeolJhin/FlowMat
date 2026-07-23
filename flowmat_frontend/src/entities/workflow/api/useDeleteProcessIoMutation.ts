import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiVoidResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'
import { removeWorkflowCanvasPort } from '../model/workflowCanvasCache'

async function deleteProcessIo(processIoId: string): Promise<void> {
  const envelope = await httpClient.delete<ApiEnvelope<null>>(`/process-ios/${processIoId}`)
  unwrapApiVoidResponse(envelope)
}

export function useDeleteProcessIoMutation(workflowId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProcessIo,
    onSuccess: (_data, processIoId) => {
      removeWorkflowCanvasPort(queryClient, workflowId, processIoId)
    },
  })
}
