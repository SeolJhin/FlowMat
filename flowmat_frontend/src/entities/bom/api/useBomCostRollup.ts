import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

/** One made item's material cost per unit, rolled up through approved BOMs (docs/domain/multi-level-bom.md). */
export interface BomCostRollupLineDto {
  itemId: string
  itemCode: string
  itemName: string | null
  unit: string | null
  bomId: string
  bomVersion: number
  /** Levels of approved BOMs below the item; 1 when it is made from bought materials only. */
  levels: number
  /** What is known, 4 decimals; a lower bound unless complete. */
  rolledUpCost: number
  complete: boolean
  /** Codes of bought materials with no unit cost. */
  missingCosts: string[]
  problems: string[]
  currentUnitCost: number | null
}

export interface BomCostRollupDto {
  /** Sub-assemblies (fewer levels) first. */
  items: BomCostRollupLineDto[]
}

/** Under ['boms', projectId] so BOM changes refresh it; an item's unit cost change is refreshed by the caller. */
export function useBomCostRollupQuery(projectId: string) {
  return useQuery<BomCostRollupDto>({
    queryKey: ['boms', projectId, 'cost-rollup'],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<BomCostRollupDto>>(`/boms/cost-rollup?projectId=${encodeURIComponent(projectId)}`),
      ),
    enabled: Boolean(projectId),
    staleTime: 0,
  })
}
