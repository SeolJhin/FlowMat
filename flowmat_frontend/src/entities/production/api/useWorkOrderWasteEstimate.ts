import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

/** A work order's waste disposal cost estimate at today's costs (docs/domain/bom-by-products.md WD8). */
export interface WorkOrderWasteEstimateDto {
  workOrderId: string
  bomId: string | null
  /** Still to make, in the product's unit; null without a BOM and quantity. */
  quantity: number | null
  disposalCost: number
  costComplete: boolean
  lines: { itemId: string; itemCode: string; itemName: string | null; quantity: number | null; unit: string | null
    unitDisposalCost: number | null; cost: number | null }[]
  /** Why nothing could be estimated; null otherwise. */
  problem: string | null
}

export function useWorkOrderWasteEstimateQuery(workOrderId: string) {
  return useQuery<WorkOrderWasteEstimateDto>({
    queryKey: ['work-orders', workOrderId, 'waste-disposal-estimate'],
    queryFn: async () => unwrapApiResponse(await httpClient.get<ApiEnvelope<WorkOrderWasteEstimateDto>>(
      `/work-orders/${encodeURIComponent(workOrderId)}/waste-disposal-estimate`)),
    enabled: Boolean(workOrderId),
    retry: false,
    staleTime: 0,
  })
}
