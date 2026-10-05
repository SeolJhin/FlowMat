import { describe, expect, it } from 'vitest'
import type { InventoryDto } from '../../../shared/types/api'
import { countSheetCsv, entriesFromSheet } from './countSheetModel'

const row = (inventoryId: string, fields: Partial<InventoryDto> = {}) =>
  ({ inventoryId, itemId: 'flour', lotNo: null, location: 'WH-A', quantity: 10, ...fields }) as InventoryDto

describe('countSheetCsv', () => {
  it('lists the records with an empty counted column, without on hand when blind', () => {
    const rows = [row('r1', { lotNo: 'L-1' }), row('r2', { location: 'Shelf, 2' })]
    expect(countSheetCsv(rows, () => 'FLR · Flour', false)).toBe(
      '\ufeffinventory_id,item,lot,location,on_hand,counted\r\nr1,FLR · Flour,L-1,WH-A,10,\r\nr2,FLR · Flour,,"Shelf, 2",10,\r\n',
    )
    expect(countSheetCsv(rows, () => 'FLR', true).split('\r\n')[0]).toBe('\ufeffinventory_id,item,lot,location,counted')
  })
})

describe('entriesFromSheet', () => {
  it('reads the counted column back by record, skipping blanks and records no longer listed', () => {
    const sheet = countSheetCsv([row('r1'), row('r2'), row('r3')], () => 'FLR', true)
      .replace('r1,FLR,,WH-A,', 'r1,FLR,,WH-A,8')
      .replace('r3,FLR,,WH-A,', 'r3,FLR,,WH-A,12')
    expect(entriesFromSheet(sheet, new Set(['r1', 'r2']))).toEqual({ ok: true, entries: { r1: '8' }, filled: 1, unknown: 1 })
  })

  it('refuses a sheet without the columns or without counts', () => {
    expect(entriesFromSheet('item,qty\nflour,1\n', new Set())).toEqual({ ok: false, error: 'The sheet needs inventory_id and counted columns.' })
    expect(entriesFromSheet('inventory_id,counted\nr1,\n', new Set(['r1']))).toEqual({ ok: false, error: 'No counted quantities in the sheet.' })
  })

  it('refuses conflicting counts for the same record instead of silently taking the last one', () => {
    expect(entriesFromSheet('inventory_id,counted\nr1,8\nr1,9\n', new Set(['r1']))).toEqual({
      ok: false, error: 'The sheet counts stock record r1 more than once. Keep one counted row per stock record.',
    })
  })

  it('also refuses repeated identical counts for a known record', () => {
    expect(entriesFromSheet('inventory_id,counted\nr1,8\nr1,8\n', new Set(['r1'])).ok).toBe(false)
  })

  it.each([
    ['inventory_id,counted,Counted', 'r1,8,80', 'counted'],
    ['inventory_id,Inventory_ID,counted', 'r1,r2,8', 'inventory_id'],
  ])('refuses repeated count columns %s instead of choosing a hidden value', (header, row, column) => {
    expect(entriesFromSheet(`${header}\n${row}\n`, new Set(['r1', 'r2']))).toEqual({
      ok: false, error: `Use only one ${column} column.`,
    })
  })

  it('allows an unfilled row alongside one counted row for the same record', () => {
    expect(entriesFromSheet('inventory_id,counted\nr1,\nr1,8\n', new Set(['r1']))).toEqual({
      ok: true, entries: { r1: '8' }, filled: 1, unknown: 0,
    })
  })
})
