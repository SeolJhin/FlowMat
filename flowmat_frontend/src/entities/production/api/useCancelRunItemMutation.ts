import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProductionRunItemDto } from '../../../shared/types/api'

/**
 * Cancels a recorded item of an open run. The server reverses its stock movement (refusing if that stock was already
 * used) and rebuilds the run's LOT genealogy, so stock, LOT and run views all need a refresh.
 */
export function useCancelRunItemMutation(runId: string, projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ productionRunItemId, reason }: { productionRunItemId: string; reason: string }) =>
      unwrapApiResponse(
        await httpClient.post<ApiEnvelope<ProductionRunItemDto>>(
          `/production-runs/${encodeURIComponent(runId)}/items/${encodeURIComponent(productionRunItemId)}/cancel`,
          { reason },
        ),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['production-run-items', runId] })
      void queryClient.invalidateQueries({ queryKey: ['inventories', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['lots', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] })
    },
  })
}
