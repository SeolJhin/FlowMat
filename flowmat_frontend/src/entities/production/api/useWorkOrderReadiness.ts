import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, WorkOrderReadinessDto } from '../../../shared/types/api'

/** Stock changes all the time, so readiness is fetched fresh whenever it is shown. */
export function useWorkOrderReadinessQuery(workOrderId: string, enabled: boolean) {
  return useQuery<WorkOrderReadinessDto>({
    queryKey: ['work-order-readiness', workOrderId],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<WorkOrderReadinessDto>>(`/work-orders/${encodeURIComponent(workOrderId)}/readiness`),
      ),
    enabled: Boolean(workOrderId) && enabled,
    staleTime: 0,
  })
}
