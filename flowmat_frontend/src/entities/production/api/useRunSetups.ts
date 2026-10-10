import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

/** A run's actual setups at the rates recorded with them (docs/domain/equipment-setup-cost.md AS5). */
export type RunSetupCost = {
  productionRunId: string
  defaultEquipmentId: string | null
  setupMinutes: number
  setupCost: number
  costComplete: boolean
  lines: {
    runSetupId: string; equipmentId: string; equipmentLabel: string; setupMinutes: number; hourlyCost: number | null
    hourlyCostVersion: number; setupCost: number | null; note: string | null; recordedBy: string; recordedAt: string
    cancelled: boolean; cancelledBy: string | null; cancelledAt: string | null; cancelReason: string | null
    /** recorded, historical (rate at the run's finish, by a correction) or estimated (docs/domain/equipment-setup-cost.md AS10). */
    rateBasis?: 'recorded' | 'historical' | 'estimated'
  }[]
}

export type RunSetupInput = { requestId: string; equipmentId?: string; setupMinutes: number; note?: string }

const key = (runId: string) => ['run-setups', runId]
const path = (runId: string) => `/production-runs/${encodeURIComponent(runId)}/setups`

export function useRunSetupsQuery(runId: string) {
  return useQuery<RunSetupCost>({
    queryKey: key(runId),
    enabled: Boolean(runId),
    retry: false,
    queryFn: async () => unwrapApiResponse(await httpClient.get<ApiEnvelope<RunSetupCost>>(path(runId))),
  })
}

/** Records a setup; the caller keeps the requestId for a retry of the same input after a lost reply (AS3). */
export function useRecordRunSetupMutation(runId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: RunSetupInput) =>
      unwrapApiResponse(await httpClient.post<ApiEnvelope<RunSetupCost>>(path(runId), input)),
    onSuccess: (result) => client.setQueryData(key(runId), result),
  })
}

export function useCancelRunSetupMutation(runId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ runSetupId, reason }: { runSetupId: string; reason: string }) =>
      unwrapApiResponse(await httpClient.post<ApiEnvelope<RunSetupCost>>(
        `${path(runId)}/${encodeURIComponent(runSetupId)}/cancel`, { reason })),
    onSuccess: (result) => client.setQueryData(key(runId), result),
  })
}
