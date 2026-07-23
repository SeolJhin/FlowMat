import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProcessConnectionDto } from '../../../shared/types/api'
import type { UpdateProcessConnectionInput } from '../model/types'
import { patchWorkflowCanvasConnection } from '../model/workflowCanvasCache'

async function updateProcessConnection(
  input: UpdateProcessConnectionInput
): Promise<ProcessConnectionDto> {
  const { connectionId, ...payload } = input
  const envelope = await httpClient.put<ApiEnvelope<ProcessConnectionDto>>(
    `/process-connections/${connectionId}`,
    payload
  )
  return unwrapApiResponse(envelope)
}

export function useUpdateProcessConnectionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateProcessConnection,
    onSuccess: (connection) => {
      patchWorkflowCanvasConnection(queryClient, connection)
    },
  })
}
