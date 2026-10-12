import { useMutation, useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

/** Suggested planned start and end on the order's equipment (docs/domain/equipment-schedule.md "계획 기간 제안"). */
export interface WorkOrderPlanSuggestionDto {
  workOrderId: string
  equipmentId: string
  /** Where the search began. */
  from: string
  plannedStartAt: string
  plannedEndAt: string
  remainingQuantity: number
  capacityPerHour: number
  productionHours: number
  changeoverHours: number
  /** Production plus changeover: the available time between the start and the end. */
  neededHours: number
  /** The order whose item this one changes over from; null without a changeover. */
  changeoverFrom: string | null
  /** Approved or running orders on the same equipment the suggestion was moved after, earliest first. */
  movedPast: string[]
}

/** Suggestions for several orders, in the order asked (docs/domain/equipment-schedule.md P8-P11). Nothing is saved. */
export interface WorkOrderBatchPlanDto {
  /** The requested start of every search; null when each order started from its own default. */
  from: string | null
  lines: {
    workOrderId: string
    workOrderNumber: string
    workOrderStatus: string
    /** Placed after the orders before it in the request; null with a problem. */
    suggestion: WorkOrderPlanSuggestionDto | null
    problem: string | null
  }[]
}

/** Read only on the server; a mutation because the orders go in the body. */
export function useWorkOrderBatchPlanMutation() {
  return useMutation({
    mutationFn: async (body: { projectId: string; workOrderIds: string[]; from: string }) =>
      unwrapApiResponse(await httpClient.post<ApiEnvelope<WorkOrderBatchPlanDto>>('/work-orders/plan-suggestions', body)),
  })
}

/** The order with the fewest changeovers to plan several orders in (docs/domain/equipment-schedule.md P13-P16). */
export interface WorkOrderPlanOrderDto {
  /** Every requested order: each equipment's in the suggested order, then those without equipment as given. */
  workOrderIds: string[]
  changeoverMinutes: number
  /** The changeover minutes of the order as ticked. */
  givenChangeoverMinutes: number
  groups: { equipmentId: string; after: string | null; workOrderIds: string[]; changeoverMinutes: number; givenChangeoverMinutes: number }[]
}

export function useWorkOrderPlanOrderMutation() {
  return useMutation({
    mutationFn: async (body: { projectId: string; workOrderIds: string[]; from?: string }) =>
      unwrapApiResponse(await httpClient.post<ApiEnvelope<WorkOrderPlanOrderDto>>('/work-orders/plan-order', body)),
  })
}

/** Fetched on demand: {@code from} stays null until the user asks, then it is the instant the search starts from. */
export function useWorkOrderPlanSuggestionQuery(workOrderId: string, from: string | null) {
  return useQuery<WorkOrderPlanSuggestionDto>({
    queryKey: ['work-order-plan', workOrderId, from],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<WorkOrderPlanSuggestionDto>>(
          `/work-orders/${encodeURIComponent(workOrderId)}/plan-suggestion?from=${encodeURIComponent(from ?? '')}`,
        ),
      ),
    enabled: Boolean(workOrderId && from),
    staleTime: 0,
    // A refusal (no capacity, no quantity, not enough time) is an answer, not a hiccup.
    retry: false,
  })
}
