import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, StockWasteDto } from '../../../shared/types/api'

/** Stock lost in the last days by why; under the stock key so stock movements refresh it. */
export function useStockWasteQuery(projectId: string, days: number) {
  return useQuery<StockWasteDto>({
    queryKey: ['inventories', projectId, 'waste', days],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<StockWasteDto>>(`/stock-waste?projectId=${encodeURIComponent(projectId)}&days=${days}`),
      ),
    enabled: Boolean(projectId),
  })
}
