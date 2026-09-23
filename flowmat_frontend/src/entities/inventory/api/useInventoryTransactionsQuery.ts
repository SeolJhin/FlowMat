import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, InventoryTransactionDto } from '../../../shared/types/api'

async function fetchInventoryTransactions(inventoryId: string): Promise<InventoryTransactionDto[]> {
  const envelope = await httpClient.get<ApiEnvelope<InventoryTransactionDto[]>>(
    `/inventory-transactions?inventoryId=${encodeURIComponent(inventoryId)}`,
  )
  return unwrapApiResponse(envelope)
}

export function useInventoryTransactionsQuery(inventoryId: string | null) {
  return useQuery<InventoryTransactionDto[]>({
    queryKey: ['inventory-transactions', inventoryId],
    queryFn: () => fetchInventoryTransactions(inventoryId ?? ''),
    enabled: Boolean(inventoryId),
  })
}
