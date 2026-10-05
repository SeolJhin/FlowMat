import { describe, expect, it } from 'vitest'
import type { DefectDto } from '../../../shared/types/api'
import type { NcrDefectLinkDto } from '../api/useNonconformities'
import { canGather, ncrBadge, ncrByDefect, ncrOptionLabel, ncrTitle } from './ncrFromDefectsModel'

function defect(defectLogId: string, defectType: string, overrides: Partial<DefectDto> = {}): DefectDto {
  return {
    defectLogId, projectId: 'p', inspectionId: null, productionRunId: null, runNumber: null, itemId: 'i', itemCode: 'HOUSING',
    itemName: 'housing', lotId: null, lotNo: null, defectType, quantity: 1, unit: 'ea', severity: 'major', reason: null,
    resolved: false, actionTaken: null, loggedBy: 'u', loggedAt: '2026-10-03T00:00:00Z', resolvedBy: null, resolvedAt: null,
    ...overrides,
  }
}

const link = (defectLogId: string, status: NcrDefectLinkDto['status']): NcrDefectLinkDto =>
  ({ defectLogId, nonconformityId: `n-${defectLogId}`, ncrNo: 'NCR-0003', status })

describe('defects and nonconformities', () => {
  it('shows the number, and the status once it is not open', () => {
    expect(ncrBadge(link('a', 'open'))).toBe('NCR-0003')
    expect(ncrBadge(link('a', 'closed'))).toBe('NCR-0003 · closed')
  })

  it('offers only open defects that no nonconformity holds', () => {
    const links = ncrByDefect([link('held', 'open')])
    expect(canGather(defect('free', 'Crack'), links)).toBe(true)
    expect(canGather(defect('held', 'Crack'), links)).toBe(false)
    expect(canGather(defect('done', 'Crack', { resolved: true }), links)).toBe(false)
  })

  it('names an open NCR to add to by number and title', () => {
    expect(ncrOptionLabel({ ncrNo: 'NCR-0003', title: 'Cracked housings' })).toBe('NCR-0003 · Cracked housings')
    expect(ncrOptionLabel({ ncrNo: 'NCR-0003', title: 'y'.repeat(80) })).toBe(`NCR-0003 · ${'y'.repeat(59)}…`)
  })

  it('starts the title from the first defect and its item', () => {
    expect(ncrTitle([])).toBe('')
    expect(ncrTitle([defect('a', 'Crack')])).toBe('Crack on HOUSING')
    expect(ncrTitle([defect('a', 'Crack'), defect('b', 'Dent'), defect('c', 'Dent')])).toBe('Crack and 2 more on HOUSING')
    expect(ncrTitle([defect('a', 'Crack', { itemCode: null })])).toBe('Crack')
    expect(ncrTitle([defect('a', 'x'.repeat(250))])).toHaveLength(200)
  })
})
