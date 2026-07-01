import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProcessConnectionDto } from '../../../shared/types/api'

export interface CreateProcessConnectionInput {
  workflowId: string
  fromProcessId: string
  toProcessId: string
  fromIoId?: string | null
  toIoId?: string | null
  itemId?: string | null
  sourceHandle?: string | null
  targetHandle?: string | null
  connectionType?: string
  connectionLabel?: string
  flowRate?: number | null
  unit?: string | null
  delayTimeSec?: number | null
  lossRate?: number | null
  priority?: number | null
}

async function createProcessConnection(
  input: CreateProcessConnectionInput
): Promise<ProcessConnectionDto> {
  const envelope = await httpClient.post<ApiEnvelope<ProcessConnectionDto>>('/process-connections', input)
  return unwrapApiResponse(envelope)
}

export function useCreateProcessConnectionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createProcessConnection,
    onSuccess: async (connection) => {
      await queryClient.invalidateQueries({ queryKey: ['workflow-canvas', connection.workflowId] })
    },
  })
}
