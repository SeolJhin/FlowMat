import { describe, expect, it } from 'vitest'
import type { ItemDetailsDto, ItemDto } from '../../../shared/types/api'
import { findItemByScan, hasScanCodes } from './itemScanModel'

const item = (itemCode: string, details: Partial<ItemDetailsDto> = {}) =>
  ({ itemId: itemCode, itemCode, itemName: itemCode, details: { itemGroup: null, spec: null, barcode: null, sku: null, storageCondition: null, description: null, ...details } }) as ItemDto

describe('findItemByScan', () => {
  const items = [item('FLR', { barcode: '8801' }), item('SALT', { sku: 'FLR' }), item('8801-OLD')]

  it('prefers the barcode, then the SKU, then the code', () => {
    expect(findItemByScan(items, ' 8801 ')?.itemCode).toBe('FLR')
    // "FLR" is SALT's SKU before it is FLR's code.
    expect(findItemByScan(items, 'FLR')?.itemCode).toBe('SALT')
    expect(findItemByScan(items, '8801-old')?.itemCode).toBe('8801-OLD')
  })

  it('matches whole values only', () => {
    expect(findItemByScan(items, '880')).toBeNull()
    expect(findItemByScan(items, '  ')).toBeNull()
  })
})

describe('hasScanCodes', () => {
  it('is true once some item has a barcode or SKU', () => {
    expect(hasScanCodes([item('A')])).toBe(false)
    expect(hasScanCodes([item('A'), item('B', { sku: 'S' })])).toBe(true)
  })
})
