import { describe, expect, it } from 'vitest'
import type { ItemDto, LotDto } from '../../../shared/types/api'
import { EMPTY_ITEM_FILTER, EMPTY_LOT_FILTER, duplicateCodes, filterItems, filterLots } from './listFilterModel'

const item = (itemCode: string, fields: Partial<ItemDto> = {}) =>
  ({ itemId: itemCode.toLowerCase(), itemCode, itemName: `${itemCode} name`, itemType: 'material', itemStatus: 'active', lotManageYn: 'N', ...fields }) as ItemDto

describe('filterItems', () => {
  const items = [item('FLOUR', { lotManageYn: 'Y' }), item('SALT', { itemStatus: 'inactive' }), item('BREAD', { itemType: 'finished_good' })]

  it('matches code, name or type, ignoring case', () => {
    expect(filterItems(items, EMPTY_ITEM_FILTER)).toHaveLength(3)
    expect(filterItems(items, { ...EMPTY_ITEM_FILTER, text: 'sal' }).map((i) => i.itemCode)).toEqual(['SALT'])
    expect(filterItems(items, { ...EMPTY_ITEM_FILTER, text: 'FINISHED' }).map((i) => i.itemCode)).toEqual(['BREAD'])
  })

  it('matches group, barcode and SKU too', () => {
    const detailed = [
      ...items,
      item('RYE', { details: { itemGroup: 'Flour', spec: null, barcode: '8801234', sku: 'SKU-9', storageCondition: null, description: null } }),
    ]
    expect(filterItems(detailed, { ...EMPTY_ITEM_FILTER, text: 'flour' }).map((i) => i.itemCode)).toEqual(['FLOUR', 'RYE'])
    expect(filterItems(detailed, { ...EMPTY_ITEM_FILTER, text: '880123' }).map((i) => i.itemCode)).toEqual(['RYE'])
    expect(filterItems(detailed, { ...EMPTY_ITEM_FILTER, text: 'sku-9' }).map((i) => i.itemCode)).toEqual(['RYE'])
  })

  it('narrows by status and LOT tracking', () => {
    expect(filterItems(items, { ...EMPTY_ITEM_FILTER, status: 'inactive' }).map((i) => i.itemCode)).toEqual(['SALT'])
    expect(filterItems(items, { ...EMPTY_ITEM_FILTER, lotTrackedOnly: true }).map((i) => i.itemCode)).toEqual(['FLOUR'])
  })
})

describe('filterLots', () => {
  const lot = (lotNo: string, fields: Partial<LotDto> = {}) =>
    ({ lotId: lotNo, itemId: 'flour', lotNo, lotStatus: 'available', expiryDate: null, quantityOnHand: 1, quantityReserved: 0, ...fields }) as LotDto
  const today = new Date(2026, 8, 25)
  const lots = [
    lot('L-OLD', { expiryDate: '2026-09-24' }),
    lot('L-TODAY', { expiryDate: '2026-09-25' }),
    lot('L-SOON', { expiryDate: '2026-10-25' }),
    lot('L-LATER', { expiryDate: '2026-10-26' }),
    lot('L-NONE'),
    lot('L-SHUT', { lotStatus: 'closed' }),
  ]
  const label = () => 'FLOUR · Flour'

  it('shows every LOT at first, can hide closed ones, and finds by LOT number or item', () => {
    expect(filterLots(lots, EMPTY_LOT_FILTER, label, today)).toHaveLength(6)
    expect(filterLots(lots, { ...EMPTY_LOT_FILTER, status: 'open' }, label, today)).toHaveLength(5)
    expect(filterLots(lots, { ...EMPTY_LOT_FILTER, status: 'closed' }, label, today).map((l) => l.lotNo)).toEqual(['L-SHUT'])
    expect(filterLots(lots, { ...EMPTY_LOT_FILTER, text: 'soon' }, label, today).map((l) => l.lotNo)).toEqual(['L-SOON'])
    expect(filterLots(lots, { ...EMPTY_LOT_FILTER, text: 'flour' }, label, today)).toHaveLength(6)
  })

  it('splits by expiry: expired before today, soon within 30 days including today, or none', () => {
    const by = (expiry: 'expired' | 'soon' | 'none') => filterLots(lots, { ...EMPTY_LOT_FILTER, expiry }, label, today).map((l) => l.lotNo)
    expect(by('expired')).toEqual(['L-OLD'])
    expect(by('soon')).toEqual(['L-TODAY', 'L-SOON'])
    expect(by('none')).toEqual(['L-NONE', 'L-SHUT'])
  })
})

describe('duplicateCodes', () => {
  it('lists codes used by more than one item, exactly as written', () => {
    const items = [item('SALT'), item('FLOUR'), { ...item('SALT'), itemId: 'salt-2' }, item('flour'), { ...item('SALT'), itemId: 'salt-3' }]
    expect(duplicateCodes(items)).toEqual([{ code: 'SALT', count: 3 }])
    expect(duplicateCodes([item('A'), item('B')])).toEqual([])
  })
})
