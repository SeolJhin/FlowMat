import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, StockAlertDto } from '../../../shared/types/api'

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
