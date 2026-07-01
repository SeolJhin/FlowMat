import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ItemDto } from '../../../shared/types/api'

async function fetchItems(projectId: string): Promise<ItemDto[]> {
  const envelope = await httpClient.get<ApiEnvelope<ItemDto[]>>(`/items?projectId=${encodeURIComponent(projectId)}`)
  return unwrapApiResponse(envelope)
}

export function useItemsQuery(projectId: string) {
  return useQuery<ItemDto[]>({
    queryKey: ['items', projectId],
    queryFn: () => fetchItems(projectId),
    enabled: Boolean(projectId),
  })
}
