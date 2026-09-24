import { describe, expect, it } from 'vitest'
import type { InventoryDto, ProductionRunItemDto } from '../../../shared/types/api'
import {
  EMPTY_DEFECT,
  EMPTY_INSPECTION,
  buildDefectRequest,
  buildInspectionRequest,
  buildResolution,
  scrapCandidates,
  describeMeasurement,
  inspectionTargets,
  measuredResult,
} from './qualityModel'

function recording(id: string, patch: Partial<ProductionRunItemDto>): ProductionRunItemDto {
  return {
    productionRunItemId: id,
    productionRunId: 'run',
    processId: null,
    processIoId: null,
    inventoryId: null,
    itemId: 'flour',
    direction: 'input',
    plannedQty: 1,
    actualQty: 1,
    unit: 'kg',
    quantitySource: 'manual',
    conversionRate: null,
    lotId: null,
    cancelled: false,
    cancelledBy: null,
    cancelledAt: null,
    cancelReason: null,
    ...patch,
  }
}

const targets = inspectionTargets([
  recording('a', { itemId: 'flour', lotId: 'lot-f' }),
  recording('b', { itemId: 'flour', lotId: 'lot-f' }),
  recording('c', { itemId: 'salt' }),
  recording('d', { itemId: 'bread', lotId: 'lot-b', direction: 'output' }),
  recording('e', { itemId: 'sugar', lotId: 'lot-s', cancelled: true }),
])

describe('quality inspection model', () => {
  it('offers each LOT or LOT-less item once, outputs first, without cancelled recordings', () => {
    expect(targets.map((t) => t.key)).toEqual(['lot:lot-b', 'lot:lot-f', 'item:salt'])
  })

  it('works out the result from a measurement the way the server does', () => {
    expect(measuredResult({ measuredValue: '14.2', standardMin: '10', standardMax: '12' })).toBe('fail')
    expect(measuredResult({ measuredValue: '12', standardMin: '10', standardMax: '12' })).toBe('pass')
    expect(measuredResult({ measuredValue: '5', standardMin: '', standardMax: '4' })).toBe('fail')
    expect(measuredResult({ measuredValue: '5', standardMin: '', standardMax: '' })).toBeNull()
  })

  it('builds the request for a LOT or an item and refuses what the server would refuse', () => {
    const measured = {
      ...EMPTY_INSPECTION,
      targetKey: 'lot:lot-b',
      inspectionType: ' Moisture ',
      measuredValue: '14.2',
      standardMin: '10',
      standardMax: '12',
      unit: '%',
      quarantineLot: true,
    }
    expect(buildInspectionRequest(measured, targets, 'run')).toEqual({
      ok: true,
      body: {
        productionRunId: 'run',
        lotId: 'lot-b',
        itemId: null,
        inspectionType: 'Moisture',
        result: 'fail',
        measuredValue: 14.2,
        standardMin: 10,
        standardMax: 12,
        unit: '%',
        note: null,
        quarantineLot: true,
      },
    })
    const visual = { ...EMPTY_INSPECTION, targetKey: 'item:salt', inspectionType: 'Visual', result: 'pass' as const }
    expect(buildInspectionRequest(visual, targets, 'run')).toMatchObject({
      ok: true,
      body: { lotId: null, itemId: 'salt', result: 'pass' },
    })

    // From the LOT page there is no run.
    expect(buildInspectionRequest({ ...visual, targetKey: 'lot:lot-f' }, targets, null)).toMatchObject({
      ok: true,
      body: { productionRunId: null, lotId: 'lot-f', itemId: null },
    })

    expect(buildInspectionRequest({ ...visual, result: '' }, targets, 'run')).toMatchObject({ ok: false })
    expect(buildInspectionRequest({ ...visual, targetKey: '' }, targets, 'run')).toMatchObject({ ok: false })
    expect(buildInspectionRequest({ ...visual, result: 'fail', quarantineLot: true }, targets, 'run')).toMatchObject({ ok: false })
    expect(buildInspectionRequest({ ...measured, standardMin: '13' }, targets, 'run')).toMatchObject({
      ok: false,
      error: 'The lower limit is above the upper limit.',
    })
    expect(buildInspectionRequest({ ...measured, measuredValue: 'wet' }, targets, 'run')).toMatchObject({ ok: false })
  })

  it('builds a defect from an inspection or from a picked target', () => {
    const fromInspection = { ...EMPTY_DEFECT, inspectionId: 'insp', quantity: '2', defectType: 'Crack', severity: 'major' as const }
    expect(buildDefectRequest(fromInspection, targets, 'run')).toEqual({
      ok: true,
      body: { inspectionId: 'insp', quantity: 2, defectType: 'Crack', severity: 'major', reason: null },
    })
    const picked = { ...EMPTY_DEFECT, targetKey: 'lot:lot-f', quantity: '1', defectType: 'Lumps', reason: ' damp ' }
    expect(buildDefectRequest(picked, targets, 'run')).toEqual({
      ok: true,
      body: { productionRunId: 'run', lotId: 'lot-f', itemId: null, quantity: 1, defectType: 'Lumps', severity: 'minor', reason: 'damp' },
    })
    expect(buildDefectRequest({ ...picked, quantity: '0' }, targets, 'run')).toMatchObject({ ok: false })
    expect(buildDefectRequest({ ...picked, targetKey: '' }, targets, 'run')).toMatchObject({ ok: false })
  })

  it('offers stock of the defective item and LOT to scrap, and builds the resolution', () => {
    const stock = [
      { inventoryId: 's1', itemId: 'bread', lotId: 'lot-b', quantity: 4 },
      { inventoryId: 's2', itemId: 'bread', lotId: 'lot-x', quantity: 4 },
      { inventoryId: 's3', itemId: 'bread', lotId: 'lot-b', quantity: 0 },
      { inventoryId: 's4', itemId: 'salt', lotId: null, quantity: 9 },
    ] as unknown as InventoryDto[]
    expect(scrapCandidates({ itemId: 'bread', lotId: 'lot-b' }, stock).map((row) => row.inventoryId)).toEqual(['s1'])
    expect(scrapCandidates({ itemId: 'bread', lotId: null }, stock).map((row) => row.inventoryId)).toEqual(['s1', 's2'])

    expect(buildResolution({ actionTaken: ' Binned ', scrapFrom: '', scrapQuantity: '' })).toEqual({
      ok: true,
      body: { actionTaken: 'Binned' },
    })
    expect(buildResolution({ actionTaken: 'Binned', scrapFrom: 's1', scrapQuantity: '3' })).toEqual({
      ok: true,
      body: { actionTaken: 'Binned', scrapInventoryId: 's1', scrapQuantity: 3 },
    })
    expect(buildResolution({ actionTaken: 'Binned', scrapFrom: 's1', scrapQuantity: '' })).toMatchObject({ ok: false })
    expect(buildResolution({ actionTaken: ' ', scrapFrom: '', scrapQuantity: '' })).toMatchObject({ ok: false })
  })

  it('describes a measurement with its limits', () => {
    const base = { measuredValue: 14.2, standardMin: 10, standardMax: 12, unit: '%' }
    expect(describeMeasurement(base)).toBe('14.2 % (limits 10–12)')
    expect(describeMeasurement({ ...base, standardMin: null, unit: null })).toBe('14.2 (at most 12)')
    expect(describeMeasurement({ ...base, standardMax: null })).toBe('14.2 % (at least 10)')
    expect(describeMeasurement({ ...base, measuredValue: null })).toBe('')
  })
})
