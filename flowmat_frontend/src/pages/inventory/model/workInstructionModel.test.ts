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
  limitText,
  ncrForValue,
  outOfLimitsNcrDescription,
  outOfLimitsNcrTitle,
  stepPayload,
  undoneLine,
} from './workInstructionModel'

function revision(itemId: string, revisionNo: number, status: WorkInstructionDto['status']): WorkInstructionDto {
  return {
    instructionId: `${itemId}-${revisionNo}`, projectId: 'p', itemId, itemCode: itemId.toUpperCase(), itemName: itemId, revisionNo, status,
    title: 'T', body: null, documentUrl: null, releasedBy: null, releasedAt: null, updatedAt: null, steps: [], blocksFinish: false,
  }
}

describe('undone confirmations', () => {
  it('say what was confirmed, by whom, and who undid it when', () => {
    const at = (hour: number, minute: number) => new Date(2026, 9, 3, hour, minute).toISOString()
    expect(undoneLine({ stepId: 's', stepNo: 1, value: '220', note: null, checkedBy: 'kim', checkedAt: at(7, 5), undoneBy: 'lee', undoneAt: at(7, 9) }))
      .toBe('Step 1 (220) · confirmed by kim 2026-10-03 07:05 · undone by lee 2026-10-03 07:09')
    expect(undoneLine({ stepId: 's', stepNo: 2, value: null, note: null, checkedBy: 'kim', checkedAt: at(7, 5), undoneBy: 'kim', undoneAt: at(7, 6) }))
      .toBe('Step 2 · confirmed by kim 2026-10-03 07:05 · undone by kim 2026-10-03 07:06')
  })
})

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
    // Limits (R7) only go with a value step, as numbers, lower first.
    expect(stepPayload({ text: 'Bake', required: true, recordsValue: true, valueLabel: 'Oven °C', valueMin: '200', valueMax: '230' }).input)
      .toEqual({ text: 'Bake', required: true, recordsValue: true, valueLabel: 'Oven °C', valueMin: 200, valueMax: 230 })
    expect(stepPayload({ text: 'Sweep', required: true, recordsValue: false, valueLabel: '', valueMin: '1', valueMax: '' }).input)
      .toEqual({ text: 'Sweep', required: true, recordsValue: false, valueLabel: null })
    expect(stepPayload({ text: 'Bake', required: true, recordsValue: true, valueLabel: '', valueMin: 'hot', valueMax: '' }).error)
      .toBe('Limits are numbers.')
    expect(stepPayload({ text: 'Bake', required: true, recordsValue: true, valueLabel: '', valueMin: '230', valueMax: '200' }).error)
      .toBe('The lower limit must not be above the upper one.')
    expect(limitText({ valueMin: 200, valueMax: 230 })).toBe('200–230')
    expect(limitText({ valueMin: 200, valueMax: null })).toBe('≥ 200')
    expect(limitText({ valueMin: null, valueMax: 230 })).toBe('≤ 230')
    expect(limitText({ valueMin: null, valueMax: null })).toBe('')
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

describe('a value outside its limits', () => {
  const step = { stepNo: 1, text: 'Preheat the oven', valueLabel: 'Oven °C', valueMin: 200, valueMax: 230 }

  it('suggests a nonconformity naming the step, the value and the limits', () => {
    expect(outOfLimitsNcrTitle(step, '250')).toBe('Step 1 Oven °C 250 outside 200–230')
    expect(outOfLimitsNcrTitle({ ...step, valueLabel: null, valueMin: null }, '9')).toBe('Step 1 value 9 outside ≤ 230')
    expect(outOfLimitsNcrTitle(step, 'x'.repeat(300))).toHaveLength(200)
    expect(outOfLimitsNcrDescription({ title: 'Baking', revisionNo: 2 }, step, { checkedBy: 'kim', checkedAt: '2026-10-03T08:00:00Z' }))
      .toBe('Work instruction "Baking" v2, step 1: Preheat the oven. Recorded by kim at 2026-10-03T08:00:00Z.')
  })

  it('finds the one already raised for that value on the run, not a cancelled one', () => {
    const title = 'Step 1 Oven °C 250 outside 200–230'
    const raised = { ncrNo: 'NCR-0002', productionRunId: 'r1', title, status: 'closed' }
    const cancelled = { ncrNo: 'NCR-0001', productionRunId: 'r1', title, status: 'cancelled' }
    const otherRun = { ncrNo: 'NCR-0003', productionRunId: 'r2', title, status: 'open' }
    expect(ncrForValue([cancelled, otherRun, raised], 'r1', title)).toBe(raised)
    expect(ncrForValue([cancelled, otherRun], 'r1', title)).toBeUndefined()
    expect(ncrForValue([raised], 'r1', 'Step 1 Oven °C 240 outside 200–230')).toBeUndefined()
  })
})
