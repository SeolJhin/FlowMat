import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import { createStockCommand } from './stockCommand'
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

export interface InventoryCountInput {
  note?: string
  lines: { inventoryId: string; countedQuantity: number; expectedQuantity: number }[]
}

/** Unacknowledged retries keep the count's key so the saved result is replayed before stale quantity validation. */
export function useInventoryCountMutation(projectId: string) {
  const queryClient = useQueryClient()
  const [command] = useState(() => createStockCommand<InventoryCountInput & { projectId: string }, InventoryCountResultDto>(
    async (input) => unwrapApiResponse(
      await httpClient.post<ApiEnvelope<InventoryCountResultDto>>('/inventory-counts', input),
    ),
  ))
  return useMutation({
    mutationFn: (input: InventoryCountInput) => command({ ...input, projectId,
      // The same set of counted rows remains the same count when a query returns those rows in a different order.
      lines: [...input.lines].sort((a, b) => a.inventoryId < b.inventoryId ? -1 : a.inventoryId > b.inventoryId ? 1 : 0),
    }),
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
