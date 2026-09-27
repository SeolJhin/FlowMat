import { describe, expect, it } from 'vitest'
import type { RunInstructionDto, WorkInstructionDto } from '../../../entities/production/api/useWorkInstructions'
import {
  EMPTY_STEP,
  documentUrlProblem,
  finishNote,
  instructionStatus,
  progressText,
  revisionsByItem,
  shownRevision,
  stepPayload,
} from './workInstructionModel'

function revision(itemId: string, revisionNo: number, status: WorkInstructionDto['status']): WorkInstructionDto {
  return {
    instructionId: `${itemId}-${revisionNo}`, projectId: 'p', itemId, itemCode: itemId.toUpperCase(), itemName: itemId, revisionNo, status,
    title: 'T', body: null, documentUrl: null, releasedBy: null, releasedAt: null, updatedAt: null, steps: [], blocksFinish: false,
  }
}

describe('revisions', () => {
  it('groups per product and shows the draft, else the released one', () => {
    const byItem = revisionsByItem([revision('bread', 1, 'retired'), revision('roll', 1, 'draft'), revision('bread', 3, 'draft'),
      revision('bread', 2, 'released')])
    expect(byItem.get('bread')?.map((one) => one.revisionNo)).toEqual([3, 2, 1])
    expect(shownRevision(byItem.get('bread') ?? [])?.revisionNo).toBe(3)
    expect(shownRevision([revision('bread', 2, 'released'), revision('bread', 1, 'retired')])?.revisionNo).toBe(2)
    expect(instructionStatus(byItem.get('bread') ?? [])).toBe('released v2 · draft v3')
    expect(instructionStatus(byItem.get('roll') ?? [])).toBe('draft v1')
    expect(instructionStatus([])).toBe('none')
  })
})

describe('steps and links', () => {
  it('checks what is sent', () => {
    expect(stepPayload(EMPTY_STEP).error).toBe('Write what the step is.')
    expect(stepPayload({ text: ' Preheat ', required: true, recordsValue: true, valueLabel: ' Oven °C ' }))
      .toEqual({ input: { text: 'Preheat', required: true, recordsValue: true, valueLabel: 'Oven °C' }, error: null })
    expect(stepPayload({ text: 'Sweep', required: false, recordsValue: false, valueLabel: 'ignored' }).input?.valueLabel).toBeNull()
    expect(documentUrlProblem('')).toBeNull()
    expect(documentUrlProblem('https://docs.example.com/wi.pdf')).toBeNull()
    expect(documentUrlProblem('javascript:alert(1)')).toBe('The document link must be an http or https address.')
  })

  it('says how far a run is', () => {
    const checklist = { requiredSteps: 2, requiredDone: 1, complete: false } as RunInstructionDto
    expect(progressText(checklist)).toBe('1 of 2 required steps done')
    expect(progressText({ ...checklist, requiredDone: 2, complete: true })).toBe('All 2 required steps done')
    expect(progressText({ ...checklist, requiredSteps: 0, requiredDone: 0, complete: true })).toBe('No required steps')
  })

  it('warns next to Finish, more firmly when the instruction blocks finishing', () => {
    const instruction = revision('tart', 1, 'released')
    const open = { requiredSteps: 2, requiredDone: 1, complete: false, instruction } as RunInstructionDto
    expect(finishNote(open)).toBe('1 required instruction step not confirmed yet.')
    expect(finishNote({ ...open, instruction: { ...instruction, blocksFinish: true } })).toBe('Confirm 1 required instruction step before finishing.')
    expect(finishNote({ ...open, complete: true })).toBeNull()
    expect(finishNote({ ...open, instruction: null })).toBeNull()
  })
})
