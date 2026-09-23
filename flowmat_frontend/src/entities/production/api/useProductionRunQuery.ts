import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProductionRunDto } from '../../../shared/types/api'

async function fetchProductionRun(productionRunId: string): Promise<ProductionRunDto> {
  const envelope = await httpClient.get<ApiEnvelope<ProductionRunDto>>(
    `/production-runs/${encodeURIComponent(productionRunId)}`,
  )
  return unwrapApiResponse(envelope)
}

export function useProductionRunQuery(productionRunId: string) {
  return useQuery<ProductionRunDto>({
    queryKey: ['production-run', productionRunId],
    queryFn: () => fetchProductionRun(productionRunId),
    enabled: Boolean(productionRunId),
  })
}
