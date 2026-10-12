import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

/** A work order's planned setup beside its runs' actual setups (docs/domain/equipment-setup-cost.md AS11). */
export interface WorkOrderSetupComparisonDto {
  workOrderId: string
  equipmentId: string | null
  plannedMinutes: number | null
  plannedCost: number | null
  runs: number
  actualMinutes: number
  actualCost: number
  actualCostComplete: boolean
}

export function useWorkOrderSetupComparisonQuery(workOrderId: string) {
  return useQuery<WorkOrderSetupComparisonDto>({
    queryKey: ['work-orders', workOrderId, 'setup-comparison'],
    queryFn: async () => unwrapApiResponse(await httpClient.get<ApiEnvelope<WorkOrderSetupComparisonDto>>(
      `/work-orders/${encodeURIComponent(workOrderId)}/setup-comparison`)),
    enabled: Boolean(workOrderId),
    retry: false,
    staleTime: 0,
  })
}
