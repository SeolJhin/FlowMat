import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

/** One past count and the records it changed (GET /inventory-counts, docs/domain/stock-count.md "실사 이력"). */
export interface InventoryCountHistoryDto {
  countId: string
  countedAt: string
  countedBy: string | null
  note: string | null
  adjusted: number
  increase: number
  /** As a positive number. */
  decrease: number
  /** The differences at today's unit costs, signed. */
  valueChange: number
  valueComplete: boolean
  lines: {
    inventoryId: string
    itemId: string
    itemCode: string | null
    itemName: string | null
    unit: string | null
    location: string | null
    lotNo: string | null
    difference: number
  }[]
}

/** The latest counts, newest first; under ['inventories', projectId] so a new count refreshes them. */
export function useInventoryCountHistoryQuery(projectId: string) {
  return useQuery<InventoryCountHistoryDto[]>({
    queryKey: ['inventories', projectId, 'count-history'],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<InventoryCountHistoryDto[]>>(`/inventory-counts?projectId=${encodeURIComponent(projectId)}`),
      ),
    enabled: Boolean(projectId),
  })
}
