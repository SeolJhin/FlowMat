import { describe, expect, it } from 'vitest'
import type { InventoryDto, InventoryTransactionDto, ItemDto } from '../../../shared/types/api'
import { canReverse, reversedIds, stockValue } from './stockModel'

function tx(overrides: Partial<InventoryTransactionDto>): InventoryTransactionDto {
  return {
    inventoryTransactionId: 't1',
    inventoryId: 'inv',
    projectId: 'p',
    itemId: 'i',
    transactionType: 'receipt',
    quantityDelta: 5,
    reservedDelta: 0,
    availableDelta: 5,
    quantityAfter: 5,
    reservedAfter: 0,
    availableAfter: 5,
    referenceType: null,
    referenceId: null,
    note: null,
    createdBy: 'u',
    createdAt: null,
    lotId: null,
    requestId: null,
    ...overrides,
  }
}

describe('canReverse', () => {
  it('allows movements that have not been reversed yet', () => {
    const receipt = tx({})
    expect(canReverse(receipt, [receipt])).toBe(true)
  })

  it('refuses reversals, quarantine changes and already reversed movements', () => {
    const receipt = tx({})
    const reversal = tx({
      inventoryTransactionId: 't2',
      transactionType: 'reversal',
      referenceType: 'inventory_transaction',
      referenceId: 't1',
    })
    expect(canReverse(receipt, [receipt, reversal])).toBe(false)
    expect(canReverse(reversal, [receipt, reversal])).toBe(false)
    expect(canReverse(tx({ transactionType: 'quarantine' }), [])).toBe(false)
    expect(canReverse(tx({ transactionType: 'production_input' }), [])).toBe(false)
    expect(canReverse(tx({ transactionType: 'production_output' }), [])).toBe(false)
    // A transfer is undone by moving the stock back.
    expect(canReverse(tx({ transactionType: 'transfer_out' }), [])).toBe(false)
    expect(canReverse(tx({ transactionType: 'transfer_in' }), [])).toBe(false)
  })
})

describe('reversedIds', () => {
  it('collects the ids reversals point at', () => {
    const history = [
      tx({ inventoryTransactionId: 't2', transactionType: 'reversal', referenceType: 'inventory_transaction', referenceId: 't1' }),
      tx({ inventoryTransactionId: 't3', transactionType: 'issue', referenceType: 'production_run_item', referenceId: 'x' }),
    ]
    expect([...reversedIds(history)]).toEqual(['t1'])
  })
})

describe('stockValue', () => {
  it('prices stock on hand at unit cost and counts records it cannot price', () => {
    const items = [
      { itemId: 'flour', unitCost: 1.5 },
      { itemId: 'salt', unitCost: 0 },
      { itemId: 'sugar', unitCost: null },
    ] as unknown as ItemDto[]
    const rows = [
      { itemId: 'flour', quantity: 10 },
      { itemId: 'flour', quantity: 2.5 },
      { itemId: 'salt', quantity: 3 },
      { itemId: 'sugar', quantity: 0 },
      { itemId: 'unknown', quantity: 1 },
    ] as unknown as InventoryDto[]
    expect(stockValue(rows, items)).toEqual({ total: 18.75, uncosted: 2 })
  })
})
