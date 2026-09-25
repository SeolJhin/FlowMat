import { useInfiniteQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, InventoryTransactionPageDto } from '../../../shared/types/api'

/** One page of the project's movement ledger, filtered on the server (docs/domain/stock-ledger.md). */
export async function fetchLedgerPage(
  projectId: string,
  filter: Record<string, string>,
  cursor: string | null,
  limit: number,
): Promise<InventoryTransactionPageDto> {
  const params = new URLSearchParams({ projectId, ...filter, limit: String(limit) })
  if (cursor) params.set('cursor', cursor)
  return unwrapApiResponse(
    await httpClient.get<ApiEnvelope<InventoryTransactionPageDto>>(`/inventory-transactions/search?${params.toString()}`),
  )
}

/**
 * The ledger page by page. The key sits under ['inventory-transactions'], so every mutation that refreshes a record's
 * history refreshes the ledger too.
 */
export function useLedgerSearchQuery(projectId: string, filter: Record<string, string>, pageSize = 100) {
  return useInfiniteQuery({
    queryKey: ['inventory-transactions', 'search', projectId, filter, pageSize],
    queryFn: ({ pageParam }) => fetchLedgerPage(projectId, filter, pageParam, pageSize),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: Boolean(projectId),
  })
}
