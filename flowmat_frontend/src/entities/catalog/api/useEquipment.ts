import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, EquipmentDto } from '../../../shared/types/api'

export type DowntimeType = 'maintenance' | 'breakdown' | 'other'

/** A period the equipment cannot work (docs/domain/equipment-schedule.md). */
export interface EquipmentDowntimeDto {
  downtimeId: string
  downtimeType: DowntimeType
  startsAt: string
  endsAt: string
  hours: number
  reason: string | null
  createdBy: string | null
  createdAt: string | null
}

/** One equipment's shift and downtime. Without a calendar the equipment is available around the clock. */
export interface EquipmentScheduleDto {
  equipmentId: string
  /** The zone shift times are read in. */
  timeZone: string
  calendar: {
    /** "09:00"; a shift that ends at or before its start runs past midnight, equal times are all day. */
    shiftStart: string
    shiftEnd: string
    /** ISO days the shift starts on, 1 = Monday. */
    workDays: number[]
    shiftHours: number
    updatedBy: string | null
    updatedAt: string | null
  } | null
  /** Newest first. */
  downtimes: EquipmentDowntimeDto[]
}

/** Working time in [from, to): shifts in the window less the downtime inside them. */
export interface EquipmentAvailabilityDto {
  equipmentId: string
  from: string
  to: string
  calendarSet: boolean
  workingHours: number
  downtimeHours: number
  availableHours: number
  capacityPerHour: number | null
  /** Available hours times the capacity per hour; null without a capacity. */
  capacity: number | null
}

export interface EquipmentCalendarInput {
  shiftStart: string
  shiftEnd: string
  workDays: number[]
}

export interface EquipmentDowntimeInput {
  downtimeType: DowntimeType
  /** ISO instants. */
  startsAt: string
  endsAt: string
  reason: string | null
}

const scheduleKey = (equipmentId: string) => ['equipment-schedule', equipmentId]

/** The project's equipment; the same cache the equipment tab uses. */
export function useEquipmentQuery(projectId: string) {
  return useQuery<EquipmentDto[]>({
    queryKey: ['equipment', projectId],
    queryFn: async () =>
      unwrapApiResponse(await httpClient.get<ApiEnvelope<EquipmentDto[]>>(`/equipments?projectId=${encodeURIComponent(projectId)}`)),
    enabled: Boolean(projectId),
  })
}

export function useEquipmentScheduleQuery(equipmentId: string) {
  return useQuery<EquipmentScheduleDto>({
    queryKey: scheduleKey(equipmentId),
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<EquipmentScheduleDto>>(`/equipments/${encodeURIComponent(equipmentId)}/schedule`),
      ),
    enabled: Boolean(equipmentId),
  })
}

export function useEquipmentAvailabilityQuery(equipmentId: string, from: string, to: string) {
  return useQuery<EquipmentAvailabilityDto>({
    queryKey: [...scheduleKey(equipmentId), 'availability', from, to],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<EquipmentAvailabilityDto>>(
          `/equipments/${encodeURIComponent(equipmentId)}/availability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        ),
      ),
    enabled: Boolean(equipmentId && from && to),
  })
}

/** Every change returns the new schedule; available time and work order readiness are fetched again. */
export function useEquipmentScheduleMutations(equipmentId: string) {
  const queryClient = useQueryClient()
  const base = `/equipments/${encodeURIComponent(equipmentId)}`
  const onSuccess = (schedule: EquipmentScheduleDto) => {
    queryClient.setQueryData(scheduleKey(equipmentId), schedule)
    void queryClient.invalidateQueries({ queryKey: [...scheduleKey(equipmentId), 'availability'] })
    void queryClient.invalidateQueries({ queryKey: ['work-order-readiness'] })
  }
  return {
    setCalendar: useMutation({
      mutationFn: async (input: EquipmentCalendarInput) =>
        unwrapApiResponse(await httpClient.put<ApiEnvelope<EquipmentScheduleDto>>(`${base}/calendar`, input)),
      onSuccess,
    }),
    clearCalendar: useMutation({
      mutationFn: async () => unwrapApiResponse(await httpClient.delete<ApiEnvelope<EquipmentScheduleDto>>(`${base}/calendar`)),
      onSuccess,
    }),
    addDowntime: useMutation({
      mutationFn: async (input: EquipmentDowntimeInput) =>
        unwrapApiResponse(await httpClient.post<ApiEnvelope<EquipmentScheduleDto>>(`${base}/downtimes`, input)),
      onSuccess,
    }),
    removeDowntime: useMutation({
      mutationFn: async (downtimeId: string) =>
        unwrapApiResponse(
          await httpClient.delete<ApiEnvelope<EquipmentScheduleDto>>(`${base}/downtimes/${encodeURIComponent(downtimeId)}`),
        ),
      onSuccess,
    }),
  }
}
