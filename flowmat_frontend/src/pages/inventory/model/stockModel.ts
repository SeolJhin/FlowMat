import type { InventoryTransactionDto } from '../../../shared/types/api'

/** Movements a user can send from the Stock tab (docs/domain/inventory-bom-lot-contract.md §2). */
export const MOVEMENT_TYPES = ['receipt', 'issue', 'reserve', 'release', 'adjustment'] as const
export type MovementType = (typeof MOVEMENT_TYPES)[number]

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  receipt: 'Receive (+ on hand)',
  issue: 'Issue (− on hand)',
  reserve: 'Reserve',
  release: 'Release reservation',
  adjustment: 'Adjust (count correction)',
}

// Production movements are corrected on their run, and a transfer is undone by moving the stock back (the server refuses
// both here too).
const NOT_REVERSIBLE = new Set([
  'reversal',
  'quarantine',
  'unquarantine',
  'production_input',
  'production_output',
  'transfer_out',
  'transfer_in',
])

/**
 * Whether the Reverse button makes sense for a history row: the type can be reversed and no reversal in the same
 * history already points at it. The server enforces the same rules (and re-checks today's stock), this only hides
 * buttons that would certainly fail.
 */
export function canReverse(transaction: InventoryTransactionDto, history: InventoryTransactionDto[]): boolean {
  if (NOT_REVERSIBLE.has(transaction.transactionType)) return false
  return !history.some(
    (other) =>
      other.transactionType === 'reversal'
      && other.referenceType === 'inventory_transaction'
      && other.referenceId === transaction.inventoryTransactionId,
  )
}

/** Ids of transactions already cancelled by a reversal in this history, to mark them in the table. */
export function reversedIds(history: InventoryTransactionDto[]): Set<string> {
  return new Set(
    history
      .filter((tx) => tx.transactionType === 'reversal' && tx.referenceType === 'inventory_transaction' && tx.referenceId)
      .map((tx) => tx.referenceId as string),
  )
}
