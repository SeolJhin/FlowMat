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

  it.each([
    ['item_code,quantity,qty', 'SUG-1,50,5', 'quantity'],
    ['item_code,bags,packs', 'SUG-1,2,20', 'bags'],
    ['item_code,quantity,location,Location', 'SUG-1,5,SRC,DEST', 'location'],
  ])('refuses ambiguous stock columns %s instead of overriding a value', (header, row, column) => {
    expect(stockRowsFromCsv(`${header}\n${row}\n`)).toEqual({
      ok: false, error: `Use only one ${column} column, including aliases.`,
    })
  })

  it('takes packs instead of a quantity', () => {
    expect(stockRowsFromCsv('item_code,location,bags\nFLR-1,WH-A,2\n')).toEqual({ ok: true, rows: [{ itemCode: 'FLR-1', location: 'WH-A', packs: '2' }] })
  })

  it('reports malformed quoted cells as a file error', () => {
    expect(stockRowsFromCsv('item_code,quantity\nFLR-1,"5')).toEqual({
      ok: false,
      error: 'A quoted CSV cell is not closed.',
    })
  })
})
