import type { StockImportRowDto } from '../../../shared/types/api'
import { parseCsv } from './itemCsvModel'

const COLUMNS: Record<string, keyof StockImportRowDto> = {
  item_code: 'itemCode',
  code: 'itemCode',
  location: 'location',
  place: 'location',
  lot_no: 'lotNo',
  lot: 'lotNo',
  quantity: 'quantity',
  qty: 'quantity',
  expiry_date: 'expiryDate',
  expiry: 'expiryDate',
  packs: 'packs',
  bags: 'packs',
  purchase_units: 'packs',
}

export const STOCK_CSV_TEMPLATE = '\ufeffitem_code,location,lot_no,quantity,expiry_date\r\n'

/**
 * Stock rows from CSV text by column name; item_code is required, with quantity or packs (the item's purchase units),
 * the rest optional.
 */
export function stockRowsFromCsv(text: string): { ok: true; rows: StockImportRowDto[] } | { ok: false; error: string } {
  const [header, ...data] = parseCsv(text)
  if (!header) return { ok: false, error: 'The file is empty.' }
  const fields = header.map((name) => COLUMNS[name.trim().toLowerCase().replace(/[\s-]+/g, '_')] ?? null)
  if (!fields.includes('itemCode')) return { ok: false, error: 'The first line must name the columns, with an item_code column.' }
  if (!fields.includes('quantity') && !fields.includes('packs')) {
    return { ok: false, error: 'The first line must name the columns, with a quantity or packs column.' }
  }
  if (data.length === 0) return { ok: false, error: 'The file has no stock rows under its header.' }
  return {
    ok: true,
    rows: data.map((cells) => {
      const row: StockImportRowDto = { itemCode: '' }
      fields.forEach((field, index) => {
        if (field) row[field] = (cells[index] ?? '').trim()
      })
      return row
    }),
  }
}
