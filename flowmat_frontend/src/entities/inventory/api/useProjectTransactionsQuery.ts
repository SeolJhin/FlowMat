import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, InventoryTransactionDto } from '../../../shared/types/api'

/**
 * Every stock movement of a project, newest first. The key sits under ['inventory-transactions'], so every mutation
 * that refreshes a record's history refreshes this too.
 */
export function useProjectTransactionsQuery(projectId: string) {
  return useQuery<InventoryTransactionDto[]>({
    queryKey: ['inventory-transactions', 'project', projectId],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<InventoryTransactionDto[]>>(
          `/inventory-transactions?projectId=${encodeURIComponent(projectId)}`,
        ),
      ),
    enabled: Boolean(projectId),
  })
}
