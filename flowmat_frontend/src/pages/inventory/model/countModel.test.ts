import { describe, expect, it } from 'vitest'
import type { InventoryDto } from '../../../shared/types/api'
import { buildCountLines, countDifference, filterCountRows } from './countModel'

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
