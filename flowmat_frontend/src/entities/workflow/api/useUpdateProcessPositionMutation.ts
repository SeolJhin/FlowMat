import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProcessDto } from '../../../shared/types/api'
import { patchWorkflowCanvasProcess } from '../model/workflowCanvasCache'

interface UpdatePositionInput {
  processId: string
  posX: number
  posY: number
}

async function updatePosition(input: UpdatePositionInput): Promise<ProcessDto> {
  const { processId, posX, posY } = input
  const envelope = await httpClient.patch<ApiEnvelope<ProcessDto>>(
    `/processes/${processId}/position`,
    { posX, posY }
  )
  return unwrapApiResponse(envelope)
}

export function useUpdateProcessPositionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updatePosition,
    onSuccess: (process) => {
      patchWorkflowCanvasProcess(queryClient, process)
    },
  })
}
