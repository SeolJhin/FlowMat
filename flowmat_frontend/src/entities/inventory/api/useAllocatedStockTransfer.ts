import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

export interface AllocatedStockTransferInput {
  projectId: string; workOrderId: string; allocationId: string; fromInventoryId: string
  toLocation: string; quantity: number; requestId: string
}
export function useAllocatedStockTransfer(projectId: string, workOrderId: string) {
  const cache = useQueryClient()
  return useMutation({
    mutationFn: async (input: AllocatedStockTransferInput) => unwrapApiResponse(await httpClient.post<ApiEnvelope<{ transferId: string }>>('/allocated-stock-transfers', input)),
    onSuccess: () => {
      for (const queryKey of [['inventories', projectId], ['work-order-allocations', workOrderId],
        ['work-order-readiness', workOrderId], ['inventory-transactions'], ['lots', projectId]]) {
        void cache.invalidateQueries({ queryKey })
      }
    },
  })
}
