import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

/** A run's equipment running time at the rates recorded with it (docs/domain/equipment-setup-cost.md ER4). */
export type RunEquipmentTime = {
  productionRunId: string
  defaultEquipmentId: string | null
  /** The run's time so far less the setups and running time that count; null when nothing is left. */
  suggestedMinutes: number | null
  runningMinutes: number
  runningCost: number
  costComplete: boolean
  lines: {
    runEquipmentTimeId: string; equipmentId: string; equipmentLabel: string; runningMinutes: number; hourlyCost: number | null
    hourlyCostVersion: number; runningCost: number | null; note: string | null; recordedBy: string; recordedAt: string
    cancelled: boolean; cancelledBy: string | null; cancelledAt: string | null; cancelReason: string | null
    /** recorded, or historical/estimated when a correction added it (ER11). */
    rateBasis?: 'recorded' | 'historical' | 'estimated'
  }[]
}

export type RunEquipmentTimeInput = { requestId: string; equipmentId?: string; runningMinutes: number; note?: string }

const key = (runId: string) => ['run-equipment-time', runId]
const path = (runId: string) => `/production-runs/${encodeURIComponent(runId)}/equipment-time`

export function useRunEquipmentTimeQuery(runId: string) {
  return useQuery<RunEquipmentTime>({
    queryKey: key(runId),
    enabled: Boolean(runId),
    retry: false,
    queryFn: async () => unwrapApiResponse(await httpClient.get<ApiEnvelope<RunEquipmentTime>>(path(runId))),
  })
}

/** Records running time; the caller keeps the requestId for a retry of the same input after a lost reply (ER2). */
export function useRecordRunEquipmentTimeMutation(runId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: RunEquipmentTimeInput) =>
      unwrapApiResponse(await httpClient.post<ApiEnvelope<RunEquipmentTime>>(path(runId), input)),
    onSuccess: (result) => client.setQueryData(key(runId), result),
  })
}

export function useCancelRunEquipmentTimeMutation(runId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ runEquipmentTimeId, reason }: { runEquipmentTimeId: string; reason: string }) =>
      unwrapApiResponse(await httpClient.post<ApiEnvelope<RunEquipmentTime>>(
        `${path(runId)}/${encodeURIComponent(runEquipmentTimeId)}/cancel`, { reason })),
    onSuccess: (result) => client.setQueryData(key(runId), result),
  })
}
