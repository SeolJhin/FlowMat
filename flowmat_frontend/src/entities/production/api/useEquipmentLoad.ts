import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

/** One work order on the board: what it needs and how much of that falls in the window. */
export interface EquipmentLoadOrderDto {
  workOrderId: string
  workOrderNumber: string
  workOrderTitle: string
  workOrderStatus: string
  targetItemId: string | null
  targetItemCode: string | null
  plannedStartAt: string
  plannedEndAt: string
  remainingQuantity: number | null
  /** Changeover from the order before it on the equipment. */
  changeoverMinutes: number | null
  /** Production time plus changeover; null without a quantity or a capacity per hour. */
  neededHours: number | null
  hoursInWindow: number | null
}

export interface EquipmentLoadRowDto {
  equipmentId: string
  equipmentCode: string | null
  equipmentName: string
  equipmentStatus: string
  capacityPerHour: number | null
  calendarSet: boolean
  availableHours: number
  downtimeHours: number
  /** Approved and running orders. */
  plannedHours: number
  draftHours: number
  /** Null when the equipment has no time in the window. */
  loadPercent: number | null
  overloaded: boolean
  unplannedOrders: number
  unmeasuredOrders: number
  orders: EquipmentLoadOrderDto[]
}

/** Each equipment's available hours against what its work orders need (docs/domain/equipment-load.md). */
export interface EquipmentLoadDto {
  from: string
  to: string
  equipment: EquipmentLoadRowDto[]
}

export function useEquipmentLoadQuery(projectId: string, from: string, to: string, enabled: boolean) {
  return useQuery<EquipmentLoadDto>({
    queryKey: ['equipment-load', projectId, from, to],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<EquipmentLoadDto>>(
          `/equipment-load?projectId=${encodeURIComponent(projectId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        ),
      ),
    enabled: Boolean(projectId) && enabled,
    staleTime: 0,
  })
}
