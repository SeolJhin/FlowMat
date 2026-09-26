import type { ItemDto, ItemImportRowDto } from '../../../shared/types/api'
import { csvCell } from './ledgerModel'

/** The columns, in export order, and the header names accepted for each on import (case and spaces ignored). */
const COLUMNS: { field: keyof ItemImportRowDto; header: string; aliases: string[] }[] = [
  { field: 'itemCode', header: 'item_code', aliases: ['code'] },
  { field: 'itemName', header: 'item_name', aliases: ['name'] },
  { field: 'itemType', header: 'item_type', aliases: ['type'] },
  { field: 'resourceCategory', header: 'category', aliases: ['resource_category'] },
  { field: 'unitCode', header: 'unit', aliases: ['unit_code'] },
  { field: 'itemStatus', header: 'status', aliases: ['item_status'] },
  { field: 'lotTracked', header: 'lot_tracked', aliases: ['lot', 'lot_manage_yn'] },
  { field: 'safetyStockQty', header: 'safety_stock', aliases: ['safety_stock_qty'] },
  { field: 'leadTimeDays', header: 'lead_time_days', aliases: ['lead_time'] },
  { field: 'unitCost', header: 'unit_cost', aliases: ['cost'] },
  { field: 'itemGroup', header: 'group', aliases: ['item_group'] },
  { field: 'spec', header: 'spec', aliases: ['specification'] },
  { field: 'barcode', header: 'barcode', aliases: ['ean', 'upc'] },
  { field: 'sku', header: 'sku', aliases: [] },
  { field: 'storageCondition', header: 'storage', aliases: ['storage_condition'] },
  { field: 'description', header: 'description', aliases: ['item_desc', 'desc'] },
  { field: 'purchaseUnit', header: 'purchase_unit', aliases: ['pack_unit'] },
  { field: 'purchaseUnitQty', header: 'purchase_unit_qty', aliases: ['units_per_pack', 'pack_size'] },
]

export const ITEM_CSV_HEADER = COLUMNS.map((column) => column.header)

/**
 * Splits CSV text into rows of cells (RFC 4180): quoted cells may hold commas, line breaks and doubled quotes. A
 * leading byte order mark is dropped and blank lines are skipped.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++
      row.push(cell)
      if (row.some((value) => value.trim() !== '')) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }
  row.push(cell)
  if (row.some((value) => value.trim() !== '')) rows.push(row)
  return rows
}

const normalise = (header: string) => header.trim().toLowerCase().replace(/[\s-]+/g, '_')

/**
 * The file's data rows as import rows, by header name. Unknown columns are ignored; item_code is required. Rows keep
 * their order, so the server's row numbers are the data rows counted from 1 (the file line is one more).
 */
export function rowsFromCsv(text: string): { ok: true; rows: ItemImportRowDto[]; ignored: string[] } | { ok: false; error: string } {
  const [header, ...data] = parseCsv(text)
  if (!header) return { ok: false, error: 'The file is empty.' }
  const fields = header.map((name) => {
    const key = normalise(name)
    return COLUMNS.find((column) => column.header === key || column.aliases.includes(key))?.field ?? null
  })
  if (!fields.includes('itemCode')) return { ok: false, error: 'The first line must name the columns, with an item_code column.' }
  if (data.length === 0) return { ok: false, error: 'The file has no items under its header.' }
  const rows = data.map((cells) => {
    const row: ItemImportRowDto = { itemCode: '' }
    fields.forEach((field, index) => {
      if (field) row[field] = (cells[index] ?? '').trim()
    })
    return row
  })
  const ignored = header.filter((_, index) => fields[index] === null)
  return { ok: true, rows, ignored }
}

/** The items as CSV in the import's own columns, so an exported file can be edited and imported again. */
export function itemsCsv(items: ItemDto[], unitCode: (unitId: string) => string | undefined): string {
  const lines = items.map((item) =>
    [
      item.itemCode,
      item.itemName,
      item.itemType,
      item.resourceCategory,
      item.unitId ? (unitCode(item.unitId) ?? '') : '',
      item.itemStatus,
      item.lotManageYn === 'Y' ? 'Y' : 'N',
      item.safetyStockQty ?? '',
      item.leadTimeDays ?? '',
      item.unitCost ?? '',
      item.details?.itemGroup ?? '',
      item.details?.spec ?? '',
      item.details?.barcode ?? '',
      item.details?.sku ?? '',
      item.details?.storageCondition ?? '',
      item.details?.description ?? '',
      item.purchaseUnit ?? '',
      item.purchaseUnit ? (item.purchaseUnitQty ?? '') : '',
    ]
      .map(csvCell)
      .join(','),
  )
  return '\ufeff' + [ITEM_CSV_HEADER.join(','), ...lines].join('\r\n') + '\r\n'
}
