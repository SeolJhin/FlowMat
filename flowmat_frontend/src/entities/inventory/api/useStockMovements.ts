import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import { newRequestId } from '../../../shared/lib/requestId'
import { createStockCommand } from './stockCommand'
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

/** Same unacknowledged contents keep their requestId; acknowledged repeats are new movements. */
export function useStockMovementMutation(projectId: string) {
  const onSuccess = useInvalidateStock(projectId)
  const [command] = useState(() => createStockCommand<StockMovementInput, InventoryTransactionDto>(
    async (input) => unwrapApiResponse(
      await httpClient.post<ApiEnvelope<InventoryTransactionDto>>('/inventory-transactions', input),
    ),
  ))
  return useMutation({ mutationFn: command, onSuccess })
}

interface StockTransferInput {
  fromInventoryId: string
  toLocation: string
  quantity: number
  note?: string
}

type StockTransferResult = { transferId: string; out: InventoryTransactionDto; in: InventoryTransactionDto }

/**
 * Moves stock to another place (docs/domain/stock-transfer.md). Unacknowledged retries share one requestId; both
 * records' histories change, so every history is refreshed after an acknowledged result.
 */
export function useStockTransferMutation(projectId: string) {
  const queryClient = useQueryClient()
  const [command] = useState(() => createStockCommand<StockTransferInput, StockTransferResult>(
    async (input) => unwrapApiResponse(
      await httpClient.post<ApiEnvelope<StockTransferResult>>('/inventory-transfers', input),
    ),
  ))
  return useMutation({
    mutationFn: command,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventories', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['lots', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] })
    },
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
