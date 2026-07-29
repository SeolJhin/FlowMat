import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProductionRunDto } from '../../../shared/types/api'

export interface StartRunInput {
  projectId: string
  workflowId: string
  targetItemId?: string
  plannedOutputQty: number
  runType?: string
  startedBy?: string
}

async function startProductionRun(input: StartRunInput): Promise<ProductionRunDto> {
  const envelope = await httpClient.post<ApiEnvelope<ProductionRunDto>>('/production-runs/start', input)
  return unwrapApiResponse(envelope)
}

export function useStartProductionRunMutation(workflowId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: startProductionRun,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['production-runs', workflowId] })
    },
  })
}
