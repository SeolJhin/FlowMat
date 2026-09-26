import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, StockMovementSummaryDto } from '../../../shared/types/api'

/** Each item's opening, in, out and closing over a period (docs/domain/stock-ledger.md); refreshes with stock. */
export function useStockMovementSummaryQuery(projectId: string, period: { from: string; to: string } | null) {
  return useQuery<StockMovementSummaryDto>({
    queryKey: ['inventories', projectId, 'movement-summary', period?.from ?? null, period?.to ?? null],
    queryFn: async () => {
      const params = new URLSearchParams({ projectId, from: period?.from ?? '', to: period?.to ?? '' })
      return unwrapApiResponse(await httpClient.get<ApiEnvelope<StockMovementSummaryDto>>(`/stock-movement-summary?${params.toString()}`))
    },
    enabled: Boolean(projectId && period),
  })
}
