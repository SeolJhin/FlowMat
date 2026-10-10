import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

/** One material in the exploded tree; bomId is set when it is a sub-assembly made by its own approved BOM. */
export interface BomExplosionLineDto {
  level: number
  parentItemId: string
  itemId: string
  itemCode: string
  itemName: string | null
  quantity: number
  unit: string
  bomId: string | null
  bomVersion: number | null
}

export interface BomExplosionMaterialDto {
  itemId: string
  itemCode: string
  itemName: string | null
  quantity: number
  unit: string
  unitCost: number | null
  cost: number | null
}

/** An approved BOM exploded through its materials' approved BOMs, gross (docs/domain/multi-level-bom.md). */
export interface BomExplosionDto {
  bomId: string
  bomVersion: number
  targetItemId: string
  targetItemCode: string
  quantity: number
  levels: number
  /** Depth first: each material right under the item it goes into. */
  lines: BomExplosionLineDto[]
  /** Bought materials added up over the whole tree. */
  materials: BomExplosionMaterialDto[]
  materialCost: number
  costComplete: boolean
  problems: string[]
  /** The day whose revisions the levels below used (docs/domain/multi-level-bom.md M7). */
  asOf?: string
}

/** {@code on}: YYYY-MM-DD, or blank for the project's today (M7). */
export function useBomExplosionQuery(bomId: string | null, quantity: number, on = '') {
  return useQuery<BomExplosionDto>({
    queryKey: ['bom-explosion', bomId, quantity, on],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<BomExplosionDto>>(`/boms/${encodeURIComponent(bomId ?? '')}/explosion?quantity=${quantity}${on ? `&on=${encodeURIComponent(on)}` : ''}`),
      ),
    enabled: Boolean(bomId) && quantity > 0,
  })
}
