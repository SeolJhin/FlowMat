import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProductionRunDto } from '../../../shared/types/api'

export interface FinishRunInput {
  productionRunId: string
  actualOutputQty?: number
  finishedBy?: string
}

async function finishProductionRun({ productionRunId, ...payload }: FinishRunInput): Promise<ProductionRunDto> {
  const envelope = await httpClient.post<ApiEnvelope<ProductionRunDto>>(
    `/production-runs/${encodeURIComponent(productionRunId)}/finish`,
    payload,
  )
  return unwrapApiResponse(envelope)
}

export function useFinishProductionRunMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: finishProductionRun,
    onSuccess: (run) => {
      queryClient.setQueryData(['production-run', run.productionRunId], run)
      void queryClient.invalidateQueries({ queryKey: ['production-runs', run.workflowId] })
      if (run.workOrderId) {
        // Finished output counts toward the work order's produced quantity.
        void queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      }
    },
  })
}
