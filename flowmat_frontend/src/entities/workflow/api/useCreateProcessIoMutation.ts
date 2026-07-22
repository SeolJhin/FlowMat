import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProcessIoDto } from '../../../shared/types/api'
import type { CreateProcessIoInput } from '../model/types'

async function createProcessIo(input: CreateProcessIoInput): Promise<ProcessIoDto> {
  const envelope = await httpClient.post<ApiEnvelope<ProcessIoDto>>('/process-ios', input)
  return unwrapApiResponse(envelope)
}

export function useCreateProcessIoMutation(workflowId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createProcessIo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workflow-canvas', workflowId] })
    },
  })
}
