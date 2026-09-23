import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProductionRunItemDto } from '../../../shared/types/api'

async function fetchProductionRunItems(productionRunId: string): Promise<ProductionRunItemDto[]> {
  const envelope = await httpClient.get<ApiEnvelope<ProductionRunItemDto[]>>(
    `/production-runs/${encodeURIComponent(productionRunId)}/items`,
  )
  return unwrapApiResponse(envelope)
}

export function useProductionRunItemsQuery(productionRunId: string) {
  return useQuery<ProductionRunItemDto[]>({
    queryKey: ['production-run-items', productionRunId],
    queryFn: () => fetchProductionRunItems(productionRunId),
    enabled: Boolean(productionRunId),
  })
}
