import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ItemDetailsDto, ItemDto } from '../../../shared/types/api'

export interface UpdateItemInput {
  itemId: string
  projectId: string
  itemName?: string
  itemType?: string
  resourceCategory?: string
  /** Empty string clears the unit. */
  unitId?: string
  itemStatus?: string
  /** Can only change while the item has no stock records (409 otherwise). */
  lotManageYn?: 'Y' | 'N'
  /** Omitted: unchanged. 0 stops watching. */
  safetyStockQty?: number
  /** Omitted: unchanged. */
  leadTimeDays?: number
  /** Omitted: unchanged. */
  unitCost?: number
  /** Must not be another item's code (409). */
  itemCode?: string
  /** Omitted: unchanged. Present: replaces every detail, so null clears. */
  details?: ItemDetailsDto
  /** Omitted: unchanged. Empty: bought in the stock unit again. */
  purchaseUnit?: string
  /** Omitted: unchanged. Needs a purchase unit. */
  purchaseUnitQty?: number
}

async function updateItem({ itemId, projectId: _pid, ...payload }: UpdateItemInput): Promise<ItemDto> {
  const envelope = await httpClient.put<ApiEnvelope<ItemDto>>(`/items/${itemId}`, payload)
  return unwrapApiResponse(envelope)
}

export function useUpdateItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateItem,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['items', data.projectId] })
    },
  })
}
