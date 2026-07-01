import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import type { ApiEnvelope, ProcessDto } from '../../../shared/types/api'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'

async function deleteProcess(processId: string): Promise<ProcessDto> {
  const envelope = await httpClient.delete<ApiEnvelope<ProcessDto>>(`/processes/${processId}`)
  return unwrapApiResponse(envelope)
}

export function useDeleteProcessMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProcess,
    onSuccess: async (process) => {
      await queryClient.invalidateQueries({ queryKey: ['workflow-canvas', process.workflowId] })
    },
  })
}
