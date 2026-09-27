import type { RunInstructionDto, WorkInstructionDto, WorkInstructionStepInput } from '../../../entities/production/api/useWorkInstructions'

/** Revisions per product, newest first (the order the server sends). */
export function revisionsByItem(instructions: WorkInstructionDto[]): Map<string, WorkInstructionDto[]> {
  const byItem = new Map<string, WorkInstructionDto[]>()
  for (const instruction of instructions) {
    byItem.set(instruction.itemId, [...(byItem.get(instruction.itemId) ?? []), instruction])
  }
  for (const revisions of byItem.values()) revisions.sort((a, b) => b.revisionNo - a.revisionNo)
  return byItem
}

/** The revision to show: the draft being written, else the released one, else the newest. */
export function shownRevision(revisions: WorkInstructionDto[]): WorkInstructionDto | undefined {
  return revisions.find((one) => one.status === 'draft') ?? revisions.find((one) => one.status === 'released') ?? revisions[0]
}

/** "released v2 · draft v3", "draft v1", or "none". */
export function instructionStatus(revisions: WorkInstructionDto[]): string {
  const released = revisions.find((one) => one.status === 'released')
  const draft = revisions.find((one) => one.status === 'draft')
  const parts = [released && `released v${released.revisionNo}`, draft && `draft v${draft.revisionNo}`].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : 'none'
}

export interface StepForm {
  text: string
  required: boolean
  recordsValue: boolean
  valueLabel: string
}

export const EMPTY_STEP: StepForm = { text: '', required: true, recordsValue: false, valueLabel: '' }

export function stepPayload(form: StepForm): { input: WorkInstructionStepInput; error: null } | { input: null; error: string } {
  const text = form.text.trim()
  if (!text) return { input: null, error: 'Write what the step is.' }
  if (text.length > 500) return { input: null, error: 'A step can be at most 500 characters.' }
  const label = form.recordsValue ? form.valueLabel.trim() : ''
  return { input: { text, required: form.required, recordsValue: form.recordsValue, valueLabel: label || null }, error: null }
}

/** Null when the link is fine (blank or an http/https address), otherwise what is wrong. */
export function documentUrlProblem(value: string): string | null {
  const url = value.trim()
  if (!url) return null
  try {
    const parsed = new URL(url)
    if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname) return null
  } catch {
    // Refused below.
  }
  return 'The document link must be an http or https address.'
}

/** The note next to Finish while required steps are open, or null; stronger when the instruction blocks finishing. */
export function finishNote(checklist: RunInstructionDto): string | null {
  if (!checklist.instruction || checklist.complete) return null
  const left = checklist.requiredSteps - checklist.requiredDone
  const steps = `${left} required instruction step${left === 1 ? '' : 's'}`
  return checklist.instruction.blocksFinish ? `Confirm ${steps} before finishing.` : `${steps} not confirmed yet.`
}

/** "All 2 required steps done", "1 of 2 required steps done", or "No required steps". */
export function progressText(checklist: RunInstructionDto): string {
  if (checklist.requiredSteps === 0) return 'No required steps'
  if (checklist.complete) return `All ${checklist.requiredSteps} required step${checklist.requiredSteps === 1 ? '' : 's'} done`
  return `${checklist.requiredDone} of ${checklist.requiredSteps} required steps done`
}
