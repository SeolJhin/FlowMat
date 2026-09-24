import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import { newRequestId } from '../../../shared/lib/requestId'
import type { ApiEnvelope } from '../../../shared/types/api'

export interface InventoryCountResultDto {
  countId: string
  adjusted: number
  unchanged: number
  lines: {
    inventoryId: string
    quantityBefore: number
    countedQuantity: number
    difference: number
    inventoryTransactionId: string | null
  }[]
}

/**
 * Applies a stock count (docs/domain/stock-count.md): every counted record is adjusted together or not at all. The
 * requestId is made once per count so a double click cannot apply it twice.
 */
export function useInventoryCountMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      note?: string
      lines: { inventoryId: string; countedQuantity: number; expectedQuantity: number }[]
    }) =>
      unwrapApiResponse(
        await httpClient.post<ApiEnvelope<InventoryCountResultDto>>('/inventory-counts', {
          projectId,
          requestId: newRequestId(),
          ...input,
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventories', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['lots', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] })
    },
  })
}
