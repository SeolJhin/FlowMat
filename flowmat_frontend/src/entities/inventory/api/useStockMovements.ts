import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import { newRequestId } from '../../../shared/lib/requestId'
import type { ApiEnvelope, InventoryTransactionDto } from '../../../shared/types/api'

/** Mirrors InventoryTransactionCreateRequest: a positive quantity, the type decides the direction. */
export interface StockMovementInput {
  inventoryId: string
  transactionType: 'receipt' | 'issue' | 'reserve' | 'release' | 'adjustment'
  quantity: number
  /** Required for adjustment only. */
  direction?: 'increase' | 'decrease'
  note?: string
}

function useInvalidateStock(projectId: string) {
  const queryClient = useQueryClient()
  return (transaction: InventoryTransactionDto) => {
    void queryClient.invalidateQueries({ queryKey: ['inventories', projectId] })
    void queryClient.invalidateQueries({ queryKey: ['lots', projectId] })
    void queryClient.invalidateQueries({ queryKey: ['inventory-transactions', transaction.inventoryId] })
  }
}

/** One stock movement (docs/domain/inventory-bom-lot-contract.md §2); each call carries a fresh requestId. */
export function useStockMovementMutation(projectId: string) {
  const onSuccess = useInvalidateStock(projectId)
  return useMutation({
    mutationFn: async (input: StockMovementInput) =>
      unwrapApiResponse(
        await httpClient.post<ApiEnvelope<InventoryTransactionDto>>('/inventory-transactions', {
          ...input,
          requestId: newRequestId(),
        }),
      ),
    onSuccess,
  })
}

/** Adds the opposite of a transaction (§3). The server allows one reversal per transaction and re-checks stock. */
export function useReverseTransactionMutation(projectId: string) {
  const onSuccess = useInvalidateStock(projectId)
  return useMutation({
    mutationFn: async ({ inventoryTransactionId, reason }: { inventoryTransactionId: string; reason: string }) =>
      unwrapApiResponse(
        await httpClient.post<ApiEnvelope<InventoryTransactionDto>>(
          `/inventory-transactions/${encodeURIComponent(inventoryTransactionId)}/reversal`,
          { requestId: newRequestId(), reason },
        ),
      ),
    onSuccess,
  })
}
