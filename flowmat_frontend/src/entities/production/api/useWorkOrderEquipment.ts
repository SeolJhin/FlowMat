import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, WorkOrderDto } from '../../../shared/types/api'

/**
 * Assigns (or with null unassigns) the equipment a work order runs on (docs/domain/equipment-schedule.md). It can change
 * until the order is completed or cancelled; readiness then checks the equipment's time in the planned window.
 */
export function useAssignWorkOrderEquipmentMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ workOrderId, equipmentId }: { workOrderId: string; equipmentId: string | null }) =>
      unwrapApiResponse(
        await httpClient.put<ApiEnvelope<WorkOrderDto>>(`/work-orders/${encodeURIComponent(workOrderId)}/equipment`, { equipmentId }),
      ),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({ queryKey: ['work-orders', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['work-order-readiness', order.workOrderId] })
    },
  })
}
