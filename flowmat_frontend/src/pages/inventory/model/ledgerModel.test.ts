import { describe, expect, it } from 'vitest'
import type { InventoryTransactionDto } from '../../../shared/types/api'
import { EMPTY_LEDGER_FILTER, LEDGER_TYPES, ledgerCsv, toSearchParams } from './ledgerModel'

function tx(id: string, patch: Partial<InventoryTransactionDto> = {}): InventoryTransactionDto {
  return {
    inventoryTransactionId: id,
    inventoryId: 'inv-1',
    projectId: 'p',
    itemId: 'flour',
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
    createdBy: 'demo-owner',
    createdAt: '2026-09-24T03:00:00Z',
    lotId: null,
    requestId: null,
    ...patch,
  }
}

describe('movement ledger', () => {
  it('sends only what is set, with local days as a whole-day range of instants', () => {
    expect(toSearchParams(EMPTY_LEDGER_FILTER)).toEqual({})
    const params = toSearchParams({ type: 'issue', itemId: 'flour', from: '2026-09-20', to: '2026-09-22', text: '  urgent ' })
    expect(params.type).toBe('issue')
    expect(params.itemId).toBe('flour')
    expect(params.text).toBe('urgent')
    expect(params.from).toBe(new Date(2026, 8, 20).toISOString())
    // "to" is the next local midnight, exclusive on the server: the 22nd counts whole.
    expect(params.to).toBe(new Date(2026, 8, 23).toISOString())
  })

  it('offers every movement type, including transfers', () => {
    expect(LEDGER_TYPES).toContain('transfer_out')
    expect(LEDGER_TYPES).toContain('production_input')
  })

  it('writes CSV with quoting and a byte order mark', () => {
    const csv = ledgerCsv([tx('x', { note: 'He said "ok", then left' })], () => 'FLOUR · Flour', () => 'WH-A')
    expect(csv.startsWith('﻿time,type,item,lot,place,quantity_change')).toBe(true)
    expect(csv).toContain('2026-09-24T03:00:00Z,receipt,FLOUR · Flour,,WH-A,5,0,5,,,"He said ""ok"", then left",demo-owner\r\n')
  })
})
