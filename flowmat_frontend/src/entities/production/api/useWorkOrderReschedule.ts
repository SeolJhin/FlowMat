import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, WorkOrderDto } from '../../../shared/types/api'

export interface WorkOrderRescheduleDto {
  changeId: string
  workOrderId: string
  requestId: string
  previousPlannedStartAt: string | null
  previousPlannedEndAt: string | null
  plannedStartAt: string | null
  plannedEndAt: string | null
  reason: string
  changedBy: string
  changedAt: string
}
export interface WorkOrderRescheduleInput {
  expectedPlannedStartAt: string | null
  expectedPlannedEndAt: string | null
  plannedStartAt: string | null
  plannedEndAt: string | null
  reason: string
}
interface Result { workOrder: WorkOrderDto; change: WorkOrderRescheduleDto }

export function useWorkOrderReschedulesQuery(workOrderId: string) {
  return useQuery({
    queryKey: ['work-order-reschedules', workOrderId],
    queryFn: async () => unwrapApiResponse(await httpClient.get<ApiEnvelope<WorkOrderRescheduleDto[]>>(
      `/work-orders/${encodeURIComponent(workOrderId)}/reschedules`,
    )),
  })
}
export function useRescheduleWorkOrderMutation(projectId: string, workOrderId: string) {
  const client = useQueryClient()
  // A response can be lost after commit. Identical contents reuse their key until acknowledged.
  const [send] = useState(() => {
    const pending = new Map<string, string>()
    return async (input: WorkOrderRescheduleInput) => {
      const signature = JSON.stringify(input)
      const requestId = pending.get(signature) ?? crypto.randomUUID()
      pending.set(signature, requestId)
      const result = unwrapApiResponse(await httpClient.post<ApiEnvelope<Result>>(
        `/work-orders/${encodeURIComponent(workOrderId)}/reschedules`, { ...input, requestId },
      ))
      pending.delete(signature)
      return result
    }
  })
  return useMutation({
    mutationFn: send,
    onError: (error) => {
      if (typeof error === 'object' && error !== null && 'httpStatus' in error && error.httpStatus === 409) {
        void client.invalidateQueries({ queryKey: ['work-orders', projectId] })
        void client.invalidateQueries({ queryKey: ['work-order-reschedules', workOrderId] })
      }
    },
    onSuccess: () => {
      for (const key of [ ['work-orders', projectId], ['work-order-reschedules', workOrderId],
        ['work-order-readiness', workOrderId], ['work-order-plan'], ['equipment-load', projectId] ]) {
        void client.invalidateQueries({ queryKey: key })
      }
    },
  })
}
