import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProductionRunDto } from '../../../shared/types/api'

async function fetchProductionRuns(workflowId: string): Promise<ProductionRunDto[]> {
  const envelope = await httpClient.get<ApiEnvelope<ProductionRunDto[]>>(
    `/production-runs?workflowId=${encodeURIComponent(workflowId)}`,
  )
  return unwrapApiResponse(envelope)
}

export function useProductionRunsQuery(workflowId: string) {
  return useQuery<ProductionRunDto[]>({
    queryKey: ['production-runs', workflowId],
    queryFn: () => fetchProductionRuns(workflowId),
    enabled: Boolean(workflowId),
  })
}
