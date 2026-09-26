import { describe, expect, it } from 'vitest'
import { STOCK_CSV_TEMPLATE, stockRowsFromCsv } from './stockImportModel'

describe('stockRowsFromCsv', () => {
  it('reads rows by column name with aliases', () => {
    expect(stockRowsFromCsv('Qty,Code,Lot,Expiry\n4,SUG-1,L-1,2027-01-31\n2,FLR-1,,\n')).toEqual({
      ok: true,
      rows: [
        { itemCode: 'SUG-1', quantity: '4', lotNo: 'L-1', expiryDate: '2027-01-31' },
        { itemCode: 'FLR-1', quantity: '2', lotNo: '', expiryDate: '' },
      ],
    })
  })

  it('needs item code and quantity columns and at least one row; the template has the header only', () => {
    expect(stockRowsFromCsv('item_code,location\nFLR-1,A')).toEqual({
      ok: false,
      error: 'The first line must name the columns, with a quantity or packs column.',
    })
    expect(stockRowsFromCsv(STOCK_CSV_TEMPLATE)).toEqual({ ok: false, error: 'The file has no stock rows under its header.' })
  })

  it('takes packs instead of a quantity', () => {
    expect(stockRowsFromCsv('item_code,location,bags\nFLR-1,WH-A,2\n')).toEqual({ ok: true, rows: [{ itemCode: 'FLR-1', location: 'WH-A', packs: '2' }] })
  })
})
