import { describe, expect, it } from 'vitest'
import type { InventoryDto } from '../../../shared/types/api'
import { buildCountLines, countDifference, countDue, countIntervalDays, filterCountRows, lastCountedLabel } from './countModel'

function row(id: string, quantity: number, patch: Partial<InventoryDto> = {}): InventoryDto {
  return {
    inventoryId: id,
    projectId: 'p',
    itemId: 'flour',
    quantity,
    reservedQuantity: 0,
    availableQuantity: quantity,
    inventoryStatus: 'available',
    location: 'WH-A',
    minThreshold: 0,
    maxThreshold: null,
    lotId: null,
    lotNo: null,
    ...patch,
  } as InventoryDto
}

describe('stock count', () => {
  const rows = [row('a', 10), row('b', 5), row('c', 7)]

  it('sends only what was counted, with the quantity seen when counting started', () => {
    expect(buildCountLines({ a: ' 8 ', b: '', c: '0' }, rows)).toEqual({
      ok: true,
      lines: [
        { inventoryId: 'a', countedQuantity: 8, expectedQuantity: 10 },
        { inventoryId: 'c', countedQuantity: 0, expectedQuantity: 7 },
      ],
    })
  })

  it('refuses nothing counted and counts that are not numbers of 0 or more', () => {
    expect(buildCountLines({}, rows)).toMatchObject({ ok: false })
    expect(buildCountLines({ a: 'ten' }, rows)).toMatchObject({ ok: false })
    expect(buildCountLines({ a: '-1' }, rows)).toMatchObject({ ok: false })
  })

  it('shows the difference a count would make', () => {
    expect(countDifference('8', 10)).toBe(-2)
    expect(countDifference('10', 10)).toBe(0)
    expect(countDifference('', 10)).toBeNull()
    expect(countDifference('x', 10)).toBeNull()
  })

  it('filters by item, LOT or location', () => {
    const mixed = [row('a', 1, { location: 'Shelf-1' }), row('b', 1, { lotNo: 'L-77', location: null }), row('c', 1, { itemId: 'salt' })]
    const label = (itemId: string) => itemId.toUpperCase()
    expect(filterCountRows(mixed, 'shelf', label).map((r) => r.inventoryId)).toEqual(['a'])
    expect(filterCountRows(mixed, 'l-77', label).map((r) => r.inventoryId)).toEqual(['b'])
    expect(filterCountRows(mixed, 'SALT', label).map((r) => r.inventoryId)).toEqual(['c'])
    expect(filterCountRows(mixed, ' ', label)).toHaveLength(3)
  })
})

describe('countDue', () => {
  const now = new Date(2026, 8, 26, 12)
  const row = (lastCheckedAt: string | null) => ({ inventoryId: 'r', lastCheckedAt }) as InventoryDto

  it('is due when never counted or counted more than 30 days ago', () => {
    expect(countDue(row(null), now)).toBe(true)
    expect(countDue(row(new Date(2026, 7, 26, 11).toISOString()), now)).toBe(true)
    expect(countDue(row(new Date(2026, 7, 27, 12).toISOString()), now)).toBe(false)
    expect(countDue(row(new Date(2026, 8, 20).toISOString()), now, 5)).toBe(true)
  })

  it('labels the local date or never', () => {
    expect(lastCountedLabel(null)).toBe('never')
    expect(lastCountedLabel(new Date(2026, 8, 3, 23, 30).toISOString())).toBe('2026-09-03')
  })
})

describe('countIntervalDays', () => {
  it('counts A items monthly, B quarterly, C twice a year and unclassed items monthly', () => {
    expect([countIntervalDays('A'), countIntervalDays('B'), countIntervalDays('C'), countIntervalDays(null)]).toEqual([30, 90, 180, 30])
    const row = { inventoryId: 'r', lastCheckedAt: new Date(2026, 5, 1).toISOString() } as InventoryDto
    const now = new Date(2026, 7, 1)
    expect(countDue(row, now, countIntervalDays('A'))).toBe(true)
    expect(countDue(row, now, countIntervalDays('B'))).toBe(false)
  })
})
