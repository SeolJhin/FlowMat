import { describe, expect, it } from 'vitest'
import type { ProductionRunItemDto, RunCorrectionLineDto } from '../../../shared/types/api'
import {
  buildCorrectionRequest,
  describeCorrectionLine,
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
