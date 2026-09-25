import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ReorderLineDto, StockAlertDto } from '../../../shared/types/api'

/**
 * Items below their safety stock (GET /stock-alerts/reorder). Under ['inventories', projectId] so stock changes refresh
 * it; it is also fetched fresh whenever the Stock tab opens, which covers edits to an item's safety stock.
 */
export function useReorderListQuery(projectId: string) {
  return useQuery<ReorderLineDto[]>({
    queryKey: ['inventories', projectId, 'reorder'],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<ReorderLineDto[]>>(`/stock-alerts/reorder?projectId=${encodeURIComponent(projectId)}`),
      ),
    enabled: Boolean(projectId),
    staleTime: 0,
  })
}

/**
 * Stock alerts, newest first (docs/domain/stock-alert.md). The key sits under ['inventories', projectId], so every
 * mutation that refreshes stock refreshes the alerts with it.
 */
export function useStockAlertsQuery(projectId: string, openOnly: boolean) {
  return useQuery<StockAlertDto[]>({
    queryKey: ['inventories', projectId, 'alerts', openOnly],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<StockAlertDto[]>>(
          `/stock-alerts?projectId=${encodeURIComponent(projectId)}&openOnly=${openOnly}`,
        ),
      ),
    enabled: Boolean(projectId),
  })
}
