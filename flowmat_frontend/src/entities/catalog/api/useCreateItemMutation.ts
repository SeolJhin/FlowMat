import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ItemDetailsDto, ItemDto } from '../../../shared/types/api'

export interface CreateItemInput {
  projectId: string
  itemCode: string
  itemName: string
  itemType?: string
  resourceCategory?: string
  unitId?: string
  itemStatus?: string
  /** "Y": stock and production of this item must name a LOT. */
  lotManageYn?: 'Y' | 'N'
  /** Stock to keep across all records; omitted or 0 means not watched. */
  safetyStockQty?: number
  leadTimeDays?: number
  /** Cost of one unit in the item's own unit. */
  unitCost?: number
  /** Omitted: every detail empty. A barcode another item has is refused (409). */
  details?: ItemDetailsDto
  /** What the item is bought in, e.g. "bag". */
  purchaseUnit?: string
  /** Stock units in one purchase unit; defaults to 1. */
  purchaseUnitQty?: number
}

async function createItem(input: CreateItemInput): Promise<ItemDto> {
  const envelope = await httpClient.post<ApiEnvelope<ItemDto>>('/items', input)
  return unwrapApiResponse(envelope)
}

export function useCreateItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createItem,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['items', data.projectId] })
    },
  })
}
