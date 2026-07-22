import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

async function deleteProcessIo(processIoId: string): Promise<void> {
  const envelope = await httpClient.delete<ApiEnvelope<null>>(`/process-ios/${processIoId}`)
  unwrapApiResponse(envelope)
}

export function useDeleteProcessIoMutation(workflowId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProcessIo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workflow-canvas', workflowId] })
    },
  })
}
