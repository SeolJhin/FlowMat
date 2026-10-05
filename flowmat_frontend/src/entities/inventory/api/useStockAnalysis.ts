import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, StockAnalysisDto } from '../../../shared/types/api'

/**
 * Consumption over the last {@code days}, days of cover and idle time per item (docs/domain/stock-analysis.md); with a
 * {@code location}, only that listed place and the places inside it. Under ['inventories', projectId] so stock movements
 * refresh it.
 */
export function useStockAnalysisQuery(projectId: string, days: number, enabled = true, location: string | null = null) {
  return useQuery<StockAnalysisDto>({
    queryKey: ['inventories', projectId, 'analysis', days, location],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<StockAnalysisDto>>(
          `/stock-analysis?projectId=${encodeURIComponent(projectId)}&days=${days}`
            + (location ? `&location=${encodeURIComponent(location)}` : ''),
        ),
      ),
    enabled: Boolean(projectId) && enabled,
    staleTime: 0,
  })
}
