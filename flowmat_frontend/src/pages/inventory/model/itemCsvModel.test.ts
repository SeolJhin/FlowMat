import { describe, expect, it } from 'vitest'
import type { ItemDto } from '../../../shared/types/api'
import { ITEM_CSV_HEADER, itemsCsv, parseCsv, rowsFromCsv } from './itemCsvModel'

describe('parseCsv', () => {
  it('reads quoted cells with commas, doubled quotes and line breaks, and drops the byte order mark', () => {
    expect(parseCsv('\ufeffa,b\r\n"x, y","say ""hi""\nthere"\n\n1,\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"\nthere'],
      ['1', ''],
    ])
  })
})

describe('rowsFromCsv', () => {
  it('maps columns by header name, in any order and with aliases', () => {
    const result = rowsFromCsv('Name,Code,Unit Cost,colour\nFlour,FLR-1,1.5,white\n')
    expect(result).toEqual({ ok: true, rows: [{ itemCode: 'FLR-1', itemName: 'Flour', unitCost: '1.5' }], ignored: ['colour'] })
  })

  it('needs an item_code column and at least one item', () => {
    expect(rowsFromCsv('')).toEqual({ ok: false, error: 'The file is empty.' })
    expect(rowsFromCsv('name\nFlour')).toMatchObject({ ok: false })
    expect(rowsFromCsv('item_code\n')).toEqual({ ok: false, error: 'The file has no items under its header.' })
  })
})

describe('itemsCsv', () => {
  it('writes the import columns so the file can be imported again', () => {
    const flour = {
      itemId: 'i1',
      projectId: 'p',
      itemCode: 'FLR-1',
      itemName: 'Flour, fine',
      itemType: 'raw_material',
      resourceCategory: 'material',
      resourceType: null,
      unitId: 'unit_kg',
      itemStatus: 'active',
      lotManageYn: 'Y',
      safetyStockQty: 50,
      leadTimeDays: 7,
      unitCost: 1.2,
      details: { itemGroup: 'flour', spec: 'T55', barcode: '880123', sku: null, storageCondition: 'Dry', description: 'For bread,\nrolls' },
      purchaseUnit: 'bag',
      purchaseUnitQty: 25,
    } as ItemDto
    const csv = itemsCsv([flour], (unitId) => (unitId === 'unit_kg' ? 'kg' : undefined))
    expect(csv).toBe(
      '\ufeff' + ITEM_CSV_HEADER.join(',') + '\r\nFLR-1,"Flour, fine",raw_material,material,kg,active,Y,50,7,1.2,flour,T55,880123,,Dry,"For bread,\nrolls",bag,25\r\n',
    )
    const back = rowsFromCsv(csv)
    expect(back.ok && back.rows[0]).toMatchObject({
      itemCode: 'FLR-1', itemName: 'Flour, fine', unitCode: 'kg', lotTracked: 'Y', barcode: '880123', sku: '', description: 'For bread,\nrolls',
      purchaseUnit: 'bag', purchaseUnitQty: '25',
    })
  })
})
