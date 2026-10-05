import { useQuery } from '@tanstack/react-query'
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
