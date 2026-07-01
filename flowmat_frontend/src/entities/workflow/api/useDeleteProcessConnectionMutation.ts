import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import type { ApiEnvelope, ProcessConnectionDto } from '../../../shared/types/api'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'

async function deleteProcessConnection(connectionId: string): Promise<ProcessConnectionDto> {
  const envelope = await httpClient.delete<ApiEnvelope<ProcessConnectionDto>>(
    `/process-connections/${connectionId}`
  )
  return unwrapApiResponse(envelope)
}

export function useDeleteProcessConnectionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProcessConnection,
    onSuccess: async (connection) => {
      await queryClient.invalidateQueries({ queryKey: ['workflow-canvas', connection.workflowId] })
    },
  })
}
