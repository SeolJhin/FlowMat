import { describe, expect, it } from 'vitest'
import type { WorkflowRevisionDto } from '../../../shared/types/api'
import { revisionCounts, revisionLine } from './revisionModel'

function revision(revisionNo: number, patch: Partial<WorkflowRevisionDto> = {}): WorkflowRevisionDto {
  return {
    workflowRevisionId: `r${revisionNo}`, workflowId: 'w', revisionNo, status: 'published', schemaVersion: 1,
    publishedBy: 'demo-owner', publishedAt: new Date(2026, 9, 3, 7, 5).toISOString(), retiredBy: null, retiredAt: null, ...patch,
  }
}

describe('revisions', () => {
  it('says who published and retired a revision and when, in local time', () => {
    expect(revisionLine(revision(1))).toBe('published by demo-owner 2026-10-03 07:05')
    expect(revisionLine(revision(1, { status: 'retired', retiredBy: 'kim', retiredAt: new Date(2026, 9, 4, 9, 0).toISOString() })))
      .toBe('published by demo-owner 2026-10-03 07:05 · retired by kim 2026-10-04 09:00')
    expect(revisionLine(revision(1, { status: 'retired' }))).toBe('published by demo-owner 2026-10-03 07:05 · retired')
  })

  it('counts published and retired revisions', () => {
    expect(revisionCounts([revision(3), revision(2, { status: 'retired' }), revision(1)])).toBe('2 published, 1 retired')
    expect(revisionCounts([])).toBe('0 published, 0 retired')
  })
})
