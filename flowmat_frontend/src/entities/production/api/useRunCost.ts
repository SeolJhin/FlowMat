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

export type RunByProductValue = {
  productionRunId: string; byProductValue: number; valueComplete: boolean;
  costBasis: 'CURRENT' | 'HISTORICAL' | 'ESTIMATED'; costBasisAt: string | null; estimated: boolean;
  lines: { itemId: string; itemCode: string; itemName: string | null; quantity: number | null;
    unit: string | null; unitCost: number | null; value: number | null; costBasis: 'CURRENT' | 'HISTORICAL' | 'ESTIMATED' }[];
}
/** Separate recorded by-product value; refreshes with the same recordings as material cost. */
export function useRunByProductValueQuery(runId: string) {
  return useQuery<RunByProductValue>({ queryKey: ['production-run-items', runId, 'by-product-value'], retry: false,
    enabled: Boolean(runId), staleTime: 0,
    queryFn: async () => unwrapApiResponse(await httpClient.get<ApiEnvelope<RunByProductValue>>(
      `/production-runs/${encodeURIComponent(runId)}/by-product-value`)) })
}
