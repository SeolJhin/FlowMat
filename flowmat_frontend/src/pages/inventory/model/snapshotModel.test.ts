import { describe, expect, it } from 'vitest'
import type { StockSnapshotRowDto } from '../../../shared/types/api'
import { endOfDay, snapshotCsv, totalsByItem, totalsByItemGroup, totalsByLocation } from './snapshotModel'

function row(itemCode: string, fields: Partial<StockSnapshotRowDto> = {}): StockSnapshotRowDto {
  return {
    inventoryId: `${itemCode}-${fields.location ?? 'A'}`,
    itemId: itemCode.toLowerCase(),
    itemCode,
    itemName: itemCode.toLowerCase(),
    unit: 'kg',
    location: 'A',
    lotId: null,
    lotNo: null,
    quantity: 1,
    reservedQuantity: 0,
    value: null,
    fromLedger: true,
    ...fields,
  }
}

describe('endOfDay', () => {
  it('is the last moment of the local day, the same on every call', () => {
    expect(endOfDay('2026-09-24')).toBe(new Date(2026, 8, 24, 23, 59, 59, 999).toISOString())
    expect(endOfDay('2026-12-31')).toBe(new Date(2026, 11, 31, 23, 59, 59, 999).toISOString())
    expect(endOfDay('2026-09-25')).toBe(endOfDay('2026-09-25'))
  })
})

describe('totalsByItem', () => {
  it('adds records up per item and loses the value when one record has none', () => {
    const totals = totalsByItem([
      row('SALT', { quantity: 2, value: null }),
      row('FLOUR', { quantity: 4, reservedQuantity: 1, value: 8 }),
      row('FLOUR', { location: 'B', quantity: 2, value: 4 }),
      row('SUGAR', { value: 3 }),
      row('SUGAR', { location: 'B', value: null }),
    ])
    expect(totals.map((t) => [t.itemCode, t.records, t.quantity, t.reservedQuantity, t.value])).toEqual([
      ['FLOUR', 2, 6, 1, 12],
      ['SALT', 1, 2, 0, null],
      ['SUGAR', 2, 2, 0, null],
    ])
  })
})

describe('snapshotCsv', () => {
  it('writes one quoted line per record after a header and a byte order mark', () => {
    const csv = snapshotCsv([row('FLOUR', { itemName: 'Flour, fine', lotNo: 'L1', quantity: 4, value: 8 })])
    expect(csv.startsWith('\ufeffitem_code,item_name,location,lot,quantity,reserved,unit,value\r\n')).toBe(true)
    expect(csv).toContain('FLOUR,"Flour, fine",A,L1,4,0,kg,8\r\n')
  })
})

describe('totalsByLocation', () => {
  it('counts records and items per place and adds up what is costed', () => {
    const totals = totalsByLocation([
      row('FLOUR', { location: 'B', value: 8 }),
      row('SALT', { location: 'B', value: null }),
      row('FLOUR', { location: 'A', inventoryId: 'f-a', value: 4 }),
      row('SUGAR', { location: null, inventoryId: 's-none', value: 3 }),
      row('FLOUR', { location: 'A', inventoryId: 'f-a2', lotNo: 'L2', value: 1 }),
    ])
    expect(totals).toEqual([
      { location: 'A', records: 2, items: 1, value: 5, uncosted: 0 },
      { location: 'B', records: 2, items: 2, value: 8, uncosted: 1 },
      { location: null, records: 1, items: 1, value: 3, uncosted: 0 },
    ])
  })
})

describe('totalsByItemGroup', () => {
  it('adds up records per item group, items without one last', () => {
    const groups: Record<string, string> = { flour: 'baking', sugar: 'baking' }
    const totals = totalsByItemGroup(
      [
        row('FLOUR', { location: 'A', value: 8 }),
        row('FLOUR', { location: 'B', value: 2 }),
        row('SUGAR', { value: null }),
        row('SALT', { value: 1 }),
      ],
      (itemId) => groups[itemId] ?? null,
    )
    expect(totals).toEqual([
      { group: 'baking', records: 3, items: 2, value: 10, uncosted: 1 },
      { group: null, records: 1, items: 1, value: 1, uncosted: 0 },
    ])
  })
})
