import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

export type BomEffectivity = {
  bomId: string; bomStatus: string; effectiveFrom: string | null; effectiveTo: string | null; periodVersion: number
  history: { changeId: string; previousEffectiveFrom: string | null; previousEffectiveTo: string | null;
    effectiveFrom: string | null; effectiveTo: string | null; periodVersion: number; reason: string;
    changedBy: string; changedAt: string }[]
}
export type BomEffectivityInput = { effectiveFrom: string | null; effectiveTo: string | null;
  expectedPeriodVersion: number; reason: string; requestId: string }
const path = (id: string) => `/boms/${encodeURIComponent(id)}/effectivity`
export function useBomEffectivityQuery(projectId: string, bomId: string) {
  return useQuery<BomEffectivity>({ queryKey: ['bom-effectivity', projectId, bomId], enabled: Boolean(bomId),
    queryFn: async () => unwrapApiResponse(await httpClient.get<ApiEnvelope<BomEffectivity>>(path(bomId))) })
}
export function useBomEffectivityMutation(projectId: string) {
  const cache = useQueryClient()
  return useMutation({ mutationFn: async ({ bomId, input }: { bomId: string; input: BomEffectivityInput }) =>
    unwrapApiResponse(await httpClient.post<ApiEnvelope<BomEffectivity>>(path(bomId), input)),
    onSuccess: (result) => {
      cache.setQueryData(['bom-effectivity', projectId, result.bomId], result)
      void cache.invalidateQueries({ queryKey: ['boms', projectId] })
    } })
}
