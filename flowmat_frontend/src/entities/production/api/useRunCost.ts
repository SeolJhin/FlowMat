import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, RunCostDto, RunMaterialUsageDto } from '../../../shared/types/api'

/**
 * A run's material cost (GET /production-runs/{id}/cost). Recordings change it, and they refresh
 * ['production-run-items', runId]; the cost sits under that key so it follows them.
 */
export function useRunCostQuery(runId: string) {
  return useQuery<RunCostDto>({
    queryKey: ['production-run-items', runId, 'cost'],
    queryFn: async () =>
      unwrapApiResponse(await httpClient.get<ApiEnvelope<RunCostDto>>(`/production-runs/${encodeURIComponent(runId)}/cost`)),
    enabled: Boolean(runId),
    staleTime: 0,
  })
}

/** The run's material use against its BOM (GET /production-runs/{id}/material-usage); follows the recordings like the cost. */
export function useRunMaterialUsageQuery(runId: string) {
  return useQuery<RunMaterialUsageDto>({
    queryKey: ['production-run-items', runId, 'material-usage'],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<RunMaterialUsageDto>>(`/production-runs/${encodeURIComponent(runId)}/material-usage`),
      ),
    enabled: Boolean(runId),
    staleTime: 0,
  })
}
