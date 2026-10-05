import { describe, expect, it } from 'vitest'
import type { InspectionStandardDto, RunQualityChecklistDto } from '../api/useInspectionStandards'
import type { QualityInspectionDto } from '../../../shared/types/api'
import {
  EMPTY_STANDARD_FORM,
  checklistCounts,
  checklistSummary,
  finishQualityWarning,
  limitsText,
  receiptCheckCounts,
  receiptCheckText,
  receiptChecklist,
  standardForm,
  standardLabel,
  standardPayload,
  usableStandards,
} from './standardModel'

function standard(standardId: string, patch: Partial<InspectionStandardDto> = {}): InspectionStandardDto {
  return {
    standardId, projectId: 'p', itemId: 'malt', itemCode: 'MALT', itemName: 'Malt', inspectionType: 'Moisture', stage: 'production',
    standardMin: 10, standardMax: 12, unit: '%', required: true, active: true, note: null, ...patch,
  }
}

describe('limitsText and standardLabel', () => {
  it('shows the limits there are, or that the check is judged pass or fail', () => {
    expect(limitsText(10, 12, '%')).toBe('10–12 %')
    expect(limitsText(null, 12, null)).toBe('≤ 12')
    expect(limitsText(10, null, 'kg')).toBe('≥ 10 kg')
    expect(limitsText(null, null, '%')).toBe('pass/fail')
    expect(standardLabel(standard('a'))).toBe('Moisture · 10–12 %')
    expect(standardLabel(standard('b', { stage: 'receipt', standardMin: null, standardMax: null }))).toBe('Moisture · pass/fail (receipt)')
  })
})

describe('usableStandards', () => {
  it('offers the active standards of the inspected item by check name', () => {
    const all = [
      standard('m', { inspectionType: 'Weight' }),
      standard('a', { inspectionType: 'Colour' }),
      standard('off', { active: false }),
      standard('other', { itemId: 'salt' }),
    ]
    expect(usableStandards(all, 'malt').map((one) => one.standardId)).toEqual(['a', 'm'])
    expect(usableStandards(all, null)).toEqual([])
  })
})

describe('standardPayload', () => {
  it('reads the form and names what is wrong', () => {
    expect(standardPayload(EMPTY_STANDARD_FORM).error).toBe('Pick the item.')
    expect(standardPayload({ ...EMPTY_STANDARD_FORM, itemId: 'malt', inspectionType: ' ' }).error).toBe('Say what is checked.')
    expect(standardPayload({ ...EMPTY_STANDARD_FORM, itemId: 'malt', inspectionType: 'W', standardMin: 'x' }).error)
      .toBe('Limits must be numbers.')
    expect(standardPayload({ ...EMPTY_STANDARD_FORM, itemId: 'malt', inspectionType: 'W', standardMin: '5', standardMax: '4' }).error)
      .toBe('The lower limit is above the upper limit.')
    expect(standardPayload({ ...standardForm(standard('a')), unit: ' ', note: ' dry ' }).input).toEqual({
      itemId: 'malt', inspectionType: 'Moisture', stage: 'production', standardMin: 10, standardMax: 12, unit: null, required: true,
      note: 'dry',
    })
  })
})

describe('checklistSummary', () => {
  it('counts required checks passed, missing and failed', () => {
    const checklist: RunQualityChecklistDto = { productionRunId: 'r', required: 2, requiredPassed: 1, requiredMissing: 1, failed: 1, lines: [] }
    expect(checklistSummary(checklist)).toBe('')
    const line = { ...standard('a'), status: 'pass' as const, inspectionId: null, measuredValue: null, inspectedAt: null }
    expect(checklistSummary({ ...checklist, lines: [line] })).toBe('1 of 2 required checks passed · 1 missing · 1 failed')
    expect(checklistSummary({ ...checklist, required: 0, requiredPassed: 0, requiredMissing: 0, failed: 0, lines: [line] }))
      .toBe('No required checks')
  })
})

describe('receiptChecklist', () => {
  function inspection(inspectionId: string, inspectionType: string, resultStatus: 'pass' | 'fail', inspectedAt: string,
    standardId: string | null = null): QualityInspectionDto {
    return {
      inspectionId, projectId: 'p', productionRunId: null, runNumber: null, itemId: 'malt', itemCode: 'MALT', itemName: 'Malt',
      lotId: 'lot-1', lotNo: 'L1', lotStatus: 'available', inspectionType, resultStatus, measuredValue: null, standardMin: null,
      standardMax: null, unit: null, note: null, inspectedBy: 'u', inspectedAt, standardId,
    }
  }

  it('takes the receipt and any-stage checks of the item and the LOT\'s latest result of each', () => {
    const standards = [
      standard('seal', { inspectionType: 'Seal', stage: 'receipt', standardMin: null, standardMax: null, unit: null }),
      standard('temp', { inspectionType: 'Temperature', stage: 'any', standardMin: 0, standardMax: 5, unit: '°C', required: false }),
      standard('label', { inspectionType: 'Label', stage: 'receipt' }),
      standard('moist', { inspectionType: 'Moisture', stage: 'production' }),
      standard('old', { inspectionType: 'Odour', stage: 'receipt', active: false }),
      standard('other', { itemId: 'hops', inspectionType: 'Seal', stage: 'receipt' }),
    ]
    const lines = receiptChecklist(standards, 'malt', [
      inspection('i1', 'seal', 'fail', '2026-10-01T09:00:00Z'),
      inspection('i2', 'Seal', 'pass', '2026-10-02T09:00:00Z'),
      // It followed another standard, so it does not count for Temperature even with the same name.
      inspection('i3', 'Temperature', 'pass', '2026-10-02T10:00:00Z', 'some-other-standard'),
    ])
    expect(lines.map((line) => [line.inspectionType, line.status, line.inspectionId])).toEqual([
      ['Label', 'missing', null],
      ['Seal', 'pass', 'i2'],
      ['Temperature', 'missing', null],
    ])
    expect(checklistSummary(checklistCounts(lines))).toBe('1 of 2 required checks passed · 1 missing')
    const followed = receiptChecklist(standards, 'malt', [inspection('i4', 'Probe', 'fail', '2026-10-03T09:00:00Z', 'temp')])
    expect(followed.find((line) => line.standardId === 'temp')?.status).toBe('fail')
    expect(checklistSummary(checklistCounts(followed))).toBe('0 of 2 required checks passed · 2 missing · 1 failed')
    expect(receiptChecklist(standards, 'barley', [])).toEqual([])

    // The LOT list's receipt filter: per LOT, the required checks missing and the failed ones.
    const counts = receiptCheckCounts(
      [{ lotId: 'lot-1', itemId: 'malt' }, { lotId: 'lot-2', itemId: 'malt' }, { lotId: 'lot-3', itemId: 'barley' }],
      standards,
      [
        inspection('i2', 'Seal', 'pass', '2026-10-02T09:00:00Z'),
        inspection('i5', 'Label', 'pass', '2026-10-02T09:00:00Z'),
        { ...inspection('i6', 'Seal', 'fail', '2026-10-02T09:00:00Z'), lotId: 'lot-2' },
        // Without a LOT it counts for none.
        { ...inspection('i7', 'Label', 'pass', '2026-10-02T11:00:00Z'), lotId: null },
      ],
    )
    expect(counts.has('lot-1')).toBe(false)
    expect(counts.get('lot-2')).toEqual({ missing: 1, failed: 1 })
    expect(counts.has('lot-3')).toBe(false)
    expect(receiptCheckText({ missing: 1, failed: 1 })).toBe('1 required check missing · 1 failed')
    expect(receiptCheckText({ missing: 2, failed: 0 })).toBe('2 required checks missing')
    expect(receiptCheckText({ missing: 0, failed: 3 })).toBe('3 failed')
  })
})

describe('finishQualityWarning', () => {
  it('names the required checks not recorded and the failed ones', () => {
    const line = (standardId: string, inspectionType: string, status: 'missing' | 'pass' | 'fail', required = true) => ({
      ...standard(standardId, { inspectionType, required }), status, inspectionId: null, measuredValue: null, inspectedAt: null,
    })
    const checklist: RunQualityChecklistDto = { productionRunId: 'r', required: 3, requiredPassed: 1, requiredMissing: 2, failed: 1, lines: [] }
    expect(finishQualityWarning(undefined)).toBeNull()
    expect(finishQualityWarning(checklist)).toBeNull()
    expect(finishQualityWarning({ ...checklist, lines: [line('a', 'Moisture', 'pass'), line('b', 'Colour', 'missing', false)] }))
      .toBeNull()
    expect(finishQualityWarning({ ...checklist, lines: [line('a', 'Moisture', 'missing')] }))
      .toBe('Quality: 1 required check is not recorded (MALT Moisture).')
    expect(finishQualityWarning({
      ...checklist,
      lines: [line('a', 'Moisture', 'missing'), line('b', 'Weight', 'missing'), line('c', 'Colour', 'fail', false)],
    })).toBe('Quality: 2 required checks are not recorded (MALT Moisture, MALT Weight); 1 check failed (MALT Colour).')
  })
})
