import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

/** A work order's planned running time beside its runs' recorded running time (docs/domain/equipment-setup-cost.md ER8). */
export interface WorkOrderRunningComparisonDto {
  workOrderId: string
  equipmentId: string | null
  capacityPerHour: number | null
  plannedMinutes: number | null
  plannedCost: number | null
  runs: number
  actualMinutes: number
  actualCost: number
  actualCostComplete: boolean
}

export function useWorkOrderRunningComparisonQuery(workOrderId: string) {
  return useQuery<WorkOrderRunningComparisonDto>({
    queryKey: ['work-orders', workOrderId, 'running-comparison'],
    queryFn: async () => unwrapApiResponse(await httpClient.get<ApiEnvelope<WorkOrderRunningComparisonDto>>(
      `/work-orders/${encodeURIComponent(workOrderId)}/running-comparison`)),
    enabled: Boolean(workOrderId),
    retry: false,
    staleTime: 0,
  })
}
