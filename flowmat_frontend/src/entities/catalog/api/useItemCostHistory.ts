import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

/** One change of an item's unit cost; null or 0 is an unknown cost (docs/domain/material-cost.md "단가 이력"). */
export interface ItemCostChangeDto {
  previousUnitCost: number | null
  unitCost: number | null
  changedBy: string
  changedAt: string
}

/** The item's unit cost changes, newest first. Under ['items', projectId], so saving an item fetches it again. */
export function useItemCostHistoryQuery(projectId: string, itemId: string) {
  return useQuery<ItemCostChangeDto[]>({
    queryKey: ['items', projectId, 'cost-history', itemId],
    queryFn: async () =>
      unwrapApiResponse(await httpClient.get<ApiEnvelope<ItemCostChangeDto[]>>(`/items/${encodeURIComponent(itemId)}/cost-history`)),
    enabled: Boolean(projectId && itemId),
  })
}
