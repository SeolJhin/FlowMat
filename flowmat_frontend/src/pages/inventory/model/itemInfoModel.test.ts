import { describe, expect, it } from 'vitest'
import type { ItemDetailsDto } from '../../../shared/types/api'
import { EMPTY_ITEM_INFO, itemInfoForm, itemInfoLines, itemInfoPayload } from './itemInfoModel'

const details: ItemDetailsDto = {
  itemGroup: 'flour', spec: 'T55', barcode: '880123', sku: null, storageCondition: 'Dry', description: null,
}

describe('itemInfoForm', () => {
  it('shows recorded fields and empties the rest', () => {
    expect(itemInfoForm(details)).toEqual({ itemGroup: 'flour', spec: 'T55', barcode: '880123', sku: '', storageCondition: 'Dry', description: '' })
    expect(itemInfoForm(undefined)).toEqual(EMPTY_ITEM_INFO)
  })
})

describe('itemInfoPayload', () => {
  it('trims and sends empty fields as null so they are cleared', () => {
    expect(itemInfoPayload({ ...itemInfoForm(details), spec: '  ', sku: ' S-1 ' })).toEqual({ ...details, spec: null, sku: 'S-1' })
  })
})

describe('itemInfoLines', () => {
  it('lists recorded fields in order with their labels', () => {
    expect(itemInfoLines(details)).toEqual([
      { label: 'Group', value: 'flour' },
      { label: 'Spec', value: 'T55' },
      { label: 'Barcode', value: '880123' },
      { label: 'Storage', value: 'Dry' },
    ])
    expect(itemInfoLines(undefined)).toEqual([])
  })
})
