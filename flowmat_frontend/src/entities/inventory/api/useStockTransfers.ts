import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, StockTransferAnalysisDto } from '../../../shared/types/api'

/** Stock moved between places in the last days; under the stock key so stock movements refresh it. */
export function useStockTransfersQuery(projectId: string, days: number) {
  return useQuery<StockTransferAnalysisDto>({
    queryKey: ['inventories', projectId, 'transfers', days],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<StockTransferAnalysisDto>>(
          `/stock-analysis/transfers?projectId=${encodeURIComponent(projectId)}&days=${days}`,
        ),
      ),
    enabled: Boolean(projectId),
  })
}
