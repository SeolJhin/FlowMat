import { describe, expect, it } from 'vitest'
import type { InspectionStandardDto, RunQualityChecklistDto } from '../api/useInspectionStandards'
import {
  EMPTY_STANDARD_FORM,
  checklistSummary,
  limitsText,
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
