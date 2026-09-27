import { describe, expect, it } from 'vitest'
import type { WarehouseTaskDto } from '../../../entities/inventory/api/useWarehouseTasks'
import type { InventoryDto, WorkOrderDto } from '../../../shared/types/api'
import {
  EMPTY_PICK,
  EMPTY_PUTAWAY,
  freeToMove,
  movableRecords,
  pickPayload,
  pickableOrders,
  putawayPayload,
  shortageText,
} from './warehouseTaskModel'

function record(inventoryId: string, patch: Partial<InventoryDto> = {}): InventoryDto {
  return {
    inventoryId, projectId: 'p', itemId: 'bolt', quantity: 10, reservedQuantity: 0, availableQuantity: 10, inventoryStatus: 'available',
    location: 'DOCK', minThreshold: null, maxThreshold: null, stockLevel: 'ok', version: 1, lotId: null, lotNo: null, ...patch,
  }
}

function task(inventoryId: string, quantity: number, status: WarehouseTaskDto['status'] = 'open'): WarehouseTaskDto {
  return {
    taskId: `t-${inventoryId}-${quantity}`, projectId: 'p', taskNo: 'WT-0001', taskType: 'putaway', status, inventoryId, itemId: 'bolt',
    itemCode: 'BOLT', itemName: 'Bolt', lotId: null, lotNo: null, quantity, fromLocation: 'DOCK', toLocation: 'SHELF', workOrderId: null,
    workOrderNumber: null, note: null, createdBy: 'u', createdAt: '2026-09-27T00:00:00Z', finishedBy: null, finishedAt: null,
    transferId: null, cancelReason: null,
  }
}

describe('freeToMove and movableRecords', () => {
  it('takes open tasks off what is available and leaves out held or fully planned records', () => {
    expect(freeToMove(record('r1'), [task('r1', 6), task('r1', 1, 'done'), task('r2', 3)])).toBe(4)
    const records = [record('r1'), record('r2', { inventoryStatus: 'hold' }), record('r3', { availableQuantity: 2 })]
    expect(movableRecords(records, [task('r3', 2)], () => 'BOLT').map((one) => one.inventoryId)).toEqual(['r1'])
  })
})

describe('pickableOrders', () => {
  it('offers approved or started orders with a BOM and a quantity', () => {
    const order = (workOrderId: string, patch: Partial<WorkOrderDto>) => ({ workOrderId, workOrderStatus: 'approved', bomId: 'b', targetQuantity: 1, ...patch }) as WorkOrderDto
    expect(pickableOrders([
      order('a', {}), order('b', { workOrderStatus: 'draft' }), order('c', { workOrderStatus: 'in_progress' }), order('d', { bomId: null }),
    ]).map((one) => one.workOrderId)).toEqual(['a', 'c'])
  })
})

describe('payloads', () => {
  it('checks a putaway against the record', () => {
    expect(putawayPayload(EMPTY_PUTAWAY, undefined, 0).error).toBe('Pick a stock record.')
    const form = { ...EMPTY_PUTAWAY, inventoryId: 'r1', quantity: '5', toLocation: 'dock' }
    expect(putawayPayload(form, record('r1'), 4).error).toBe('Only 4 of this record is free to move.')
    expect(putawayPayload({ ...form, quantity: '3' }, record('r1'), 4).error).toBe('The stock is already there.')
    expect(putawayPayload({ ...form, quantity: '3', toLocation: ' SHELF ' }, record('r1'), 4).input)
      .toEqual({ inventoryId: 'r1', quantity: 3, toLocation: 'SHELF', note: null })
  })

  it('builds a pick list from an order or from lines', () => {
    expect(pickPayload(EMPTY_PICK).error).toBe('Say where to pick to.')
    expect(pickPayload({ ...EMPTY_PICK, stagingLocation: 'LINE', workOrderId: 'wo' }).input)
      .toEqual({ stagingLocation: 'LINE', workOrderId: 'wo', note: null })
    expect(pickPayload({ ...EMPTY_PICK, stagingLocation: 'LINE', workOrderId: 'wo', quantity: '-1' }).error)
      .toBe('The quantity to pick for must be above 0.')
    const items = { ...EMPTY_PICK, mode: 'items' as const, stagingLocation: 'LINE' }
    expect(pickPayload(items).error).toBe('Add an item to pick.')
    expect(pickPayload({ ...items, lines: [{ itemId: 'salt', quantity: '' }] }).error).toBe('Every line needs an item and a quantity above 0.')
    expect(pickPayload({ ...items, lines: [{ itemId: 'salt', quantity: '5' }, { itemId: '', quantity: '' }] }).input)
      .toEqual({ stagingLocation: 'LINE', lines: [{ itemId: 'salt', quantity: 5 }], note: null })
  })

  it('names what could not be planned', () => {
    const line = { itemId: 'f', itemCode: 'FLOUR', required: 10, atStaging: 0, alreadyPlanned: 0, plannedNow: 6, shortage: 4 }
    expect(shortageText([line, { ...line, itemCode: 'SALT', shortage: 0 }])).toBe('Short: FLOUR 4')
    expect(shortageText([{ ...line, shortage: 0 }])).toBe('')
  })
})
