import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

/** A work order's crew and each person's time in its planned window (docs/domain/worker-calendar.md WC12). */
export interface WorkOrderCrewDto {
  workOrderId: string
  plannedStartAt: string | null
  plannedEndAt: string | null
  members: {
    userId: string
    /** The part of their working time in the window the order needs, 1 to 100 (worker-calendar.md WC36). */
    sharePercent?: number
    /** Null without a planned window to check. */
    calendarSet: boolean | null
    hoursInWindow: number | null
  }[]
}

const key = (workOrderId: string) => ['work-order-crew', workOrderId]
const path = (workOrderId: string) => `/work-orders/${encodeURIComponent(workOrderId)}/crew`

export function useWorkOrderCrewQuery(workOrderId: string) {
  return useQuery<WorkOrderCrewDto>({
    queryKey: key(workOrderId),
    enabled: Boolean(workOrderId),
    retry: false,
    queryFn: async () => unwrapApiResponse(await httpClient.get<ApiEnvelope<WorkOrderCrewDto>>(path(workOrderId))),
  })
}

export type WorkOrderCrewInput = { userId: string; sharePercent: number }[]

/** Names the crew with each person's share; readiness and plan suggestions read it, so they are fetched again. */
export function useSetWorkOrderCrewMutation(workOrderId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (members: WorkOrderCrewInput) =>
      unwrapApiResponse(await httpClient.put<ApiEnvelope<WorkOrderCrewDto>>(path(workOrderId), { members })),
    onSuccess: (result) => {
      client.setQueryData(key(workOrderId), result)
      void client.invalidateQueries({ queryKey: ['work-order-readiness', workOrderId] })
      void client.invalidateQueries({ queryKey: ['work-order-plan', workOrderId] })
      void client.invalidateQueries({ queryKey: ['worker-load'] })
    },
  })
}
