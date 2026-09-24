import { describe, expect, it } from 'vitest'
import type { InventoryTransactionDto } from '../../../shared/types/api'
import { EMPTY_LEDGER_FILTER, filterLedger, ledgerCsv, ledgerTypes } from './ledgerModel'

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

const noonLocal = (day: string) => new Date(`${day}T12:00:00`).toISOString()

describe('movement ledger', () => {
  const rows = [
    tx('a', { transactionType: 'issue', createdAt: noonLocal('2026-09-20'), note: 'To line 2' }),
    tx('b', { itemId: 'salt', createdAt: noonLocal('2026-09-22'), referenceType: 'inventory_count', referenceId: 'count-9' }),
    tx('c', { transactionType: 'transfer_out', createdAt: noonLocal('2026-09-24'), createdBy: 'kim' }),
    tx('d', { createdAt: null }),
  ]

  it('narrows by type, item, date range and text', () => {
    const ids = (filter: Partial<typeof EMPTY_LEDGER_FILTER>) =>
      filterLedger(rows, { ...EMPTY_LEDGER_FILTER, ...filter }).map((row) => row.inventoryTransactionId)
    expect(ids({})).toEqual(['a', 'b', 'c', 'd'])
    expect(ids({ type: 'issue' })).toEqual(['a'])
    expect(ids({ itemId: 'salt' })).toEqual(['b'])
    expect(ids({ from: '2026-09-21', to: '2026-09-23' })).toEqual(['b'])
    expect(ids({ from: '2026-09-24' })).toEqual(['c'])
    expect(ids({ text: 'COUNT' })).toEqual(['b'])
    expect(ids({ text: 'kim' })).toEqual(['c'])
    expect(ids({ text: 'line 2' })).toEqual(['a'])
  })

  it('lists the types present', () => {
    expect(ledgerTypes(rows)).toEqual(['issue', 'receipt', 'transfer_out'])
  })

  it('writes CSV with quoting and a byte order mark', () => {
    const csv = ledgerCsv([tx('x', { note: 'He said "ok", then left' })], () => 'FLOUR · Flour', () => 'WH-A')
    expect(csv.startsWith('﻿time,type,item,lot,place,quantity_change')).toBe(true)
    expect(csv).toContain('2026-09-24T03:00:00Z,receipt,FLOUR · Flour,,WH-A,5,0,5,,,"He said ""ok"", then left",demo-owner\r\n')
  })
})
