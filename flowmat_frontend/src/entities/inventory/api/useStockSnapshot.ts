import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, StockSnapshotDto } from '../../../shared/types/api'

/** Stock at a moment, rebuilt from the ledger (docs/domain/stock-ledger.md). Nothing is fetched until a moment is given. */
export function useStockSnapshotQuery(projectId: string, at: string | null) {
  return useQuery<StockSnapshotDto>({
    queryKey: ['inventories', projectId, 'snapshot', at],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<StockSnapshotDto>>(
          `/inventory-snapshots?projectId=${encodeURIComponent(projectId)}&at=${encodeURIComponent(at ?? '')}`,
        ),
      ),
    enabled: Boolean(projectId && at),
  })
}
