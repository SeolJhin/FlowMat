import { describe, expect, it } from 'vitest'
import type { InventoryDto, LotDto, ProductionRunItemDto, RunCorrectionLineDto } from '../../../shared/types/api'
import {
  buildCorrectionRequest,
  describeCorrectionLine,
  inputLotOptions,
  orderStockForPick,
  voidableRecordings,
  type CorrectionDraft,
} from './correctionModel'

function row(overrides: Partial<ProductionRunItemDto>): ProductionRunItemDto {
  return {
    productionRunItemId: 'r',
    productionRunId: 'run',
    processId: null,
    processIoId: null,
    inventoryId: null,
    itemId: 'flour',
    direction: 'input',
    plannedQty: 5,
    actualQty: 5,
    unit: 'kg',
    quantitySource: 'manual',
    conversionRate: null,
    lotId: null,
    cancelled: false,
    cancelledBy: null,
    cancelledAt: null,
    cancelReason: null,
    ...overrides,
  }
}

const draft = (overrides: Partial<CorrectionDraft>): CorrectionDraft => ({
  reason: 'Wrong LOT',
  voidRunItemIds: [],
  adds: [],
  outputQty: '',
  ...overrides,
})

describe('building a correction request', () => {
  it('voids, adds and sets the output in that order', () => {
    const result = buildCorrectionRequest(
      draft({
        voidRunItemIds: ['a'],
        adds: [{ direction: 'input', itemId: 'flour', inventoryId: 'lot-b', qty: '5', unit: ' kg ' }],
        outputQty: '6',
      }),
      4,
    )
    expect(result).toEqual({
      ok: true,
      body: {
        reason: 'Wrong LOT',
        lines: [
          { kind: 'void_item', targetRunItemId: 'a' },
          { kind: 'add_item', direction: 'input', itemId: 'flour', inventoryId: 'lot-b', qty: 5, unit: 'kg' },
          { kind: 'set_output_qty', afterQty: 6 },
        ],
      },
    })
  })

  it('says what is missing', () => {
    expect(buildCorrectionRequest(draft({ reason: ' ' }), 1)).toEqual({ ok: false, error: 'Give a reason for the correction.' })
    expect(buildCorrectionRequest(draft({}), 1)).toEqual({ ok: false, error: 'Choose at least one change.' })
    expect(
      buildCorrectionRequest(draft({ adds: [{ direction: 'input', itemId: 'flour', inventoryId: '', qty: '0', unit: 'kg' }] }), 1),
    ).toEqual({ ok: false, error: 'Added recording 1: the quantity must be greater than 0.' })
    expect(buildCorrectionRequest(draft({ outputQty: '4' }), 4)).toEqual({ ok: false, error: "The run's output is already 4." })
  })

  it('sends no stock record when none was chosen', () => {
    const result = buildCorrectionRequest(
      draft({ adds: [{ direction: 'output', itemId: 'bread', inventoryId: '', qty: '2', unit: 'ea' }] }),
      null,
    )
    expect(result.ok && result.body.lines[0]).toMatchObject({ kind: 'add_item', inventoryId: null })
  })
})

describe('correction lines', () => {
  const items = [row({ productionRunItemId: 'a' }), row({ productionRunItemId: 'b', cancelled: true }), row({ productionRunItemId: 'p', quantitySource: 'bom' })]
  const label = (id: string) => id.toUpperCase()
  const qty = (value: number | null | undefined) => String(value ?? '-')
  const line = (overrides: Partial<RunCorrectionLineDto>): RunCorrectionLineDto => ({
    lineNo: 1,
    kind: 'void_item',
    targetRunItemId: null,
    direction: null,
    itemId: null,
    inventoryId: null,
    qty: null,
    unit: null,
    beforeQty: null,
    afterQty: null,
    createdRunItemId: null,
    ...overrides,
  })

  it('only offers standing recordings for voiding', () => {
    expect(voidableRecordings(items).map((item) => item.productionRunItemId)).toEqual(['a'])
  })

  it('describes each kind', () => {
    expect(describeCorrectionLine(line({ targetRunItemId: 'a' }), items, label, qty)).toBe('Void input FLOUR 5 kg')
    expect(describeCorrectionLine(line({ kind: 'add_item', direction: 'input', itemId: 'salt', qty: 1, unit: 'kg' }), items, label, qty))
      .toBe('Add input SALT 1 kg')
    expect(describeCorrectionLine(line({ kind: 'set_output_qty', beforeQty: 4, afterQty: 6 }), items, label, qty)).toBe('Output 4 → 6')
  })
})

describe('stock offered for an added recording', () => {
  const inv = (id: string, lotId: string | null) => ({ inventoryId: id, lotId }) as unknown as InventoryDto
  const lot = (lotId: string, expiryDate: string | null, expired = false) => ({ lotId, expiryDate, expired }) as unknown as LotDto

  it('puts the first-expiring LOT first, undated next and expired LOTs last', () => {
    const picks = orderStockForPick(
      [inv('none', null), inv('late', 'L2'), inv('gone', 'L3'), inv('soon', 'L1'), inv('undated', 'L4')],
      [lot('L1', '2026-10-01'), lot('L2', '2026-12-01'), lot('L3', '2026-09-01', true), lot('L4', null)],
    )
    expect(picks.map((pick) => pick.inventory.inventoryId)).toEqual(['soon', 'late', 'none', 'undated', 'gone'])
    expect(picks[4]).toMatchObject({ expired: true, expiryDate: '2026-09-01' })
  })
})

describe('LOTs offered in a run record form', () => {
  const inv = (id: string, lotId: string | null, inventoryStatus = 'available') => ({ inventoryId: id, lotId, inventoryStatus }) as unknown as InventoryDto
  const lot = (lotId: string, expiryDate: string | null, expired = false) => ({ lotId, expiryDate, expired }) as unknown as LotDto
  const lots = [lot('L1', '2026-10-01'), lot('L2', '2026-12-01'), lot('L3', '2026-09-01', true)]

  it('orders inputs FEFO, blocks expired and quarantined records and marks the first usable one', () => {
    const options = inputLotOptions([inv('late', 'L2'), inv('gone', 'L3'), inv('held', 'L1', 'quarantined'), inv('soon', 'L1')], lots, 'input')
    expect(options.map((option) => [option.inventory.inventoryId, option.disabled, option.useFirst])).toEqual([
      ['held', true, false],
      ['soon', false, true],
      ['late', false, false],
      ['gone', true, false],
    ])
  })

  it('marks nothing when there is no choice or no expiry date, and keeps outputs as they are', () => {
    expect(inputLotOptions([inv('soon', 'L1')], lots, 'input')[0].useFirst).toBe(false)
    expect(inputLotOptions([inv('a', null), inv('b', null)], lots, 'input').some((option) => option.useFirst)).toBe(false)
    const outputs = inputLotOptions([inv('gone', 'L3'), inv('late', 'L2')], lots, 'output')
    expect(outputs.map((option) => [option.inventory.inventoryId, option.disabled])).toEqual([['gone', false], ['late', false]])
  })
})
