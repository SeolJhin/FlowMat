import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

export interface WorkerShiftDto {
  shiftId: string
  /** "HH:mm" */
  shiftStart: string
  shiftEnd: string
  /** ISO days, 1 (Monday) to 7 (Sunday). */
  workDays: number[]
  hours: number
  /** The rota week it runs in; 1 without a rota (docs/domain/worker-calendar.md WC44). Older answers leave it out. */
  rotaWeek?: number
}

/** How a worker's shifts repeat (WC44): every {@code weeks} weeks from the Monday startsOn; currentWeek is today's. */
export interface WorkerRotaDto {
  weeks: number
  startsOn: string
  currentWeek: number
}

export interface WorkerDayOffDto {
  dayOffId: string
  firstDay: string
  lastDay: string
  reason: string | null
  createdBy: string
}

/** A date's own shifts in place of the weekly ones (docs/domain/worker-calendar.md WC29); off without any. */
export interface WorkerDayDto {
  /** YYYY-MM-DD */
  date: string
  shifts: { shiftStart: string; shiftEnd: string; hours: number }[]
  off: boolean
  hours: number
  reason: string | null
  updatedBy: string
}

/** A worker's calendar in a project (docs/domain/worker-calendar.md WC5). */
export interface WorkerCalendarDto {
  projectId: string
  userId: string
  owner: boolean
  calendarSet: boolean
  weeklyHours: number
  shifts: WorkerShiftDto[]
  daysOff: WorkerDayOffDto[]
  /** Dates with their own shifts from 31 days ago on (WC29). */
  days?: WorkerDayDto[]
  /** Null or left out for one week (WC44). */
  rota?: WorkerRotaDto | null
}

export type WorkerShiftInput = { shiftStart: string; shiftEnd: string; workDays: number[]; rotaWeek?: number }

/** One date's shifts, or none for a day without work; a range with the same shifts when throughDate is given. */
export interface WorkerDayInput {
  shifts: { shiftStart: string; shiftEnd: string }[]
  reason: string | null
  throughDate?: string
  weekDays?: number[]
}

const key = (projectId: string) => ['worker-calendars', projectId]
const base = (projectId: string) => `/projects/${encodeURIComponent(projectId)}/workers`

export function useWorkerCalendarsQuery(projectId: string) {
  return useQuery<WorkerCalendarDto[]>({
    queryKey: key(projectId),
    enabled: Boolean(projectId),
    retry: false,
    queryFn: async () => unwrapApiResponse(await httpClient.get<ApiEnvelope<WorkerCalendarDto[]>>(base(projectId))),
  })
}

function useRefresh(projectId: string) {
  const client = useQueryClient()
  return () => {
    void client.invalidateQueries({ queryKey: key(projectId) })
    void client.invalidateQueries({ queryKey: ['work-order-readiness'] })
    void client.invalidateQueries({ queryKey: ['worker-load', projectId] })
  }
}

export function useSetWorkerShiftsMutation(projectId: string) {
  const onSuccess = useRefresh(projectId)
  return useMutation({
    mutationFn: async ({ userId, shifts, rota }: {
      userId: string; shifts: WorkerShiftInput[]; rota?: { weeks: number; startsOn: string } | null
    }) =>
      unwrapApiResponse(await httpClient.put<ApiEnvelope<WorkerCalendarDto>>(
        `${base(projectId)}/${encodeURIComponent(userId)}/shifts`, rota ? { shifts, rota } : { shifts })),
    onSuccess,
  })
}

export function useAddWorkerDayOffMutation(projectId: string) {
  const onSuccess = useRefresh(projectId)
  return useMutation({
    mutationFn: async ({ userId, ...input }: { userId: string; firstDay: string; lastDay: string; reason?: string }) =>
      unwrapApiResponse(await httpClient.post<ApiEnvelope<WorkerCalendarDto>>(
        `${base(projectId)}/${encodeURIComponent(userId)}/days-off`, input)),
    onSuccess,
  })
}

export function useSetWorkerDayMutation(projectId: string) {
  const onSuccess = useRefresh(projectId)
  return useMutation({
    mutationFn: async ({ userId, date, input }: { userId: string; date: string; input: WorkerDayInput }) =>
      unwrapApiResponse(await httpClient.put<ApiEnvelope<WorkerCalendarDto>>(
        `${base(projectId)}/${encodeURIComponent(userId)}/days/${encodeURIComponent(date)}`, input)),
    onSuccess,
  })
}

export function useRemoveWorkerDayMutation(projectId: string) {
  const onSuccess = useRefresh(projectId)
  return useMutation({
    mutationFn: async ({ userId, date }: { userId: string; date: string }) =>
      unwrapApiResponse(await httpClient.delete<ApiEnvelope<WorkerCalendarDto>>(
        `${base(projectId)}/${encodeURIComponent(userId)}/days/${encodeURIComponent(date)}`)),
    onSuccess,
  })
}

/**
 * Copies a worker's own dates to another worker, replacing those dates there; their other dates stay
 * (docs/domain/worker-calendar.md WC41). The answer is the other worker's calendar.
 */
export function useCopyWorkerDaysMutation(projectId: string) {
  const onSuccess = useRefresh(projectId)
  return useMutation({
    mutationFn: async ({ userId, ...input }: { userId: string; toUserId: string; fromDate?: string; throughDate?: string }) =>
      unwrapApiResponse(await httpClient.post<ApiEnvelope<WorkerCalendarDto>>(
        `${base(projectId)}/${encodeURIComponent(userId)}/days/copy`, input)),
    onSuccess,
  })
}

export function useRemoveWorkerDayOffMutation(projectId: string) {
  const onSuccess = useRefresh(projectId)
  return useMutation({
    mutationFn: async ({ userId, dayOffId }: { userId: string; dayOffId: string }) =>
      unwrapApiResponse(await httpClient.delete<ApiEnvelope<WorkerCalendarDto>>(
        `${base(projectId)}/${encodeURIComponent(userId)}/days-off/${encodeURIComponent(dayOffId)}`)),
    onSuccess,
  })
}
