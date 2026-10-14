import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

export interface WorkerLoadOrderDto {
  workOrderId: string
  workOrderNumber: string
  workOrderTitle: string
  workOrderStatus: string
  /** Their share of the order (worker-calendar.md WC36); 100 when left out. */
  sharePercent?: number
  plannedStartAt: string
  plannedEndAt: string
  /** Their working time inside the order's window and the board's. */
  hoursInWindow: number
}

/** Two approved or running orders that want the person at the same time; hours are 0 when their shifts are not set. */
export interface WorkerLoadOverlapDto {
  firstWorkOrderNumber: string
  secondWorkOrderNumber: string
  from: string
  to: string
  hours: number
}

export interface WorkerLoadRowDto {
  userId: string
  owner: boolean
  calendarSet: boolean
  shiftHours: number
  /** Approved and running orders, added up per order. */
  plannedHours: number
  draftHours: number
  /** Null when they have no shift time in the window. */
  loadPercent: number | null
  overloaded: boolean
  unplannedOrders: number
  orders: WorkerLoadOrderDto[]
  overlaps: WorkerLoadOverlapDto[]
}

/** Each worker's shift hours against the work orders that name them (docs/domain/worker-calendar.md WC18-WC20). */
export interface WorkerLoadDto {
  from: string
  to: string
  workers: WorkerLoadRowDto[]
}

export function useWorkerLoadQuery(projectId: string, from: string, to: string, enabled: boolean) {
  return useQuery<WorkerLoadDto>({
    queryKey: ['worker-load', projectId, from, to],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<WorkerLoadDto>>(
          `/worker-load?projectId=${encodeURIComponent(projectId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        ),
      ),
    enabled: Boolean(projectId) && enabled,
    staleTime: 0,
  })
}
