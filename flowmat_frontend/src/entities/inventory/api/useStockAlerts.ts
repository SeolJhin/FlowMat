import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ReorderLineDto, StockAlertDto } from '../../../shared/types/api'

/**
 * Items below their safety stock (GET /stock-alerts/reorder), or below their safety stock at one place when
 * {@code location} is given (docs/domain/stock-alert.md PS4). Under ['inventories', projectId] so stock changes refresh
 * it; it is also fetched fresh whenever the Stock tab opens, which covers edits to an item's safety stock.
 */
export function useReorderListQuery(projectId: string, location: string | null = null) {
  return useQuery<ReorderLineDto[]>({
    queryKey: ['inventories', projectId, 'reorder', location],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<ReorderLineDto[]>>(`/stock-alerts/reorder?projectId=${encodeURIComponent(projectId)}`
          + (location ? `&location=${encodeURIComponent(location)}` : '')),
      ),
    enabled: Boolean(projectId),
    staleTime: 0,
  })
}

/** An item's safety stock at one place of the location list (docs/domain/stock-alert.md PS1-PS3). */
export interface PlaceSafetyStockDto {
  placeSafetyStockId: string
  itemId: string
  itemCode: string | null
  itemName: string | null
  unit: string | null
  locationId: string
  locationCode: string
  safetyStockQty: number
  updatedBy: string
  updatedAt: string
}

const placeSafetyStocksKey = (projectId: string) => ['inventories', projectId, 'place-safety-stocks'] as const

/** The project's safety stocks per item and place, by place code and item code. */
export function usePlaceSafetyStocksQuery(projectId: string) {
  return useQuery<PlaceSafetyStockDto[]>({
    queryKey: placeSafetyStocksKey(projectId),
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<PlaceSafetyStockDto[]>>(`/stock-alerts/place-safety-stocks?projectId=${encodeURIComponent(projectId)}`),
      ),
    enabled: Boolean(projectId),
  })
}

/** Sets an item's safety stock at a place; none removes it (PS2). Answers the project's list; the reorder lists refresh. */
export function useSetPlaceSafetyStockMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { itemId: string; locationId: string; safetyStockQty: number | null }) =>
      unwrapApiResponse(await httpClient.put<ApiEnvelope<PlaceSafetyStockDto[]>>('/stock-alerts/place-safety-stocks', { projectId, ...input })),
    onSuccess: (list) => {
      queryClient.setQueryData(placeSafetyStocksKey(projectId), list)
      void queryClient.invalidateQueries({ queryKey: ['inventories', projectId, 'reorder'] })
    },
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
