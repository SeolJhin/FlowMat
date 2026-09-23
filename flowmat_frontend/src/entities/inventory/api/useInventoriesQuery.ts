import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, InventoryDto } from '../../../shared/types/api'

async function fetchInventories(projectId: string): Promise<InventoryDto[]> {
  const envelope = await httpClient.get<ApiEnvelope<InventoryDto[]>>(
    `/inventories?projectId=${encodeURIComponent(projectId)}`,
  )
  return unwrapApiResponse(envelope)
}

export function useInventoriesQuery(projectId: string) {
  return useQuery<InventoryDto[]>({
    queryKey: ['inventories', projectId],
    queryFn: () => fetchInventories(projectId),
    enabled: Boolean(projectId),
  })
}
