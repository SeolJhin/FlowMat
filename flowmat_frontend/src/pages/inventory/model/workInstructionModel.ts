import type { RunInstructionDto, WorkInstructionDto, WorkInstructionStepDto, WorkInstructionStepInput } from '../../../entities/production/api/useWorkInstructions'

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
  /** Limits typed for a value step; blank for none. */
  valueMin?: string
  valueMax?: string
}

export const EMPTY_STEP: StepForm = { text: '', required: true, recordsValue: false, valueLabel: '', valueMin: '', valueMax: '' }

export function stepPayload(form: StepForm): { input: WorkInstructionStepInput; error: null } | { input: null; error: string } {
  const text = form.text.trim()
  if (!text) return { input: null, error: 'Write what the step is.' }
  if (text.length > 500) return { input: null, error: 'A step can be at most 500 characters.' }
  const label = form.recordsValue ? form.valueLabel.trim() : ''
  const limit = (typed: string | undefined) => (form.recordsValue && (typed ?? '').trim() !== '' ? Number(typed) : null)
  const valueMin = limit(form.valueMin)
  const valueMax = limit(form.valueMax)
  if ((valueMin !== null && !Number.isFinite(valueMin)) || (valueMax !== null && !Number.isFinite(valueMax))) {
    return { input: null, error: 'Limits are numbers.' }
  }
  if (valueMin !== null && valueMax !== null && valueMin > valueMax) {
    return { input: null, error: 'The lower limit must not be above the upper one.' }
  }
  return {
    input: {
      text, required: form.required, recordsValue: form.recordsValue, valueLabel: label || null,
      ...(valueMin !== null ? { valueMin } : {}), ...(valueMax !== null ? { valueMax } : {}),
    },
    error: null,
  }
}

/** "200–230", "≥ 200", "≤ 230", or "" without limits. */
export function limitText(step: Pick<WorkInstructionStepDto, 'valueMin' | 'valueMax'>): string {
  if (step.valueMin !== null && step.valueMax !== null) return `${step.valueMin}–${step.valueMax}`
  if (step.valueMin !== null) return `≥ ${step.valueMin}`
  if (step.valueMax !== null) return `≤ ${step.valueMax}`
  return ''
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
function stamp(iso: string): string {
  const time = new Date(iso)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${time.getFullYear()}-${pad(time.getMonth() + 1)}-${pad(time.getDate())} ${pad(time.getHours())}:${pad(time.getMinutes())}`
}

/** e.g. "Step 1 (220) · confirmed by kim 2026-10-03 07:05 · undone by lee 2026-10-03 07:09", in local time. */
export function undoneLine(entry: RunInstructionDto['undone'][number]): string {
  const value = entry.value ? ` (${entry.value})` : ''
  return `Step ${entry.stepNo}${value} · confirmed by ${entry.checkedBy} ${stamp(entry.checkedAt)} · undone by ${entry.undoneBy} ${stamp(entry.undoneAt)}`
}

export function progressText(checklist: RunInstructionDto): string {
  if (checklist.requiredSteps === 0) return 'No required steps'
  if (checklist.complete) return `All ${checklist.requiredSteps} required step${checklist.requiredSteps === 1 ? '' : 's'} done`
  return `${checklist.requiredDone} of ${checklist.requiredSteps} required steps done`
}

/**
 * The title of the nonconformity a value outside its step's limits suggests (R8): the step, the value and the limits, so
 * the run's nonconformities show whether that value already has one.
 */
export function outOfLimitsNcrTitle(
  step: Pick<WorkInstructionStepDto, 'stepNo' | 'valueLabel' | 'valueMin' | 'valueMax'>,
  value: string,
): string {
  return `Step ${step.stepNo} ${step.valueLabel ?? 'value'} ${value} outside ${limitText(step)}`.slice(0, 200)
}

/** What the suggested nonconformity says about where the value came from (R8). */
export function outOfLimitsNcrDescription(
  instruction: Pick<WorkInstructionDto, 'title' | 'revisionNo'>,
  step: Pick<WorkInstructionStepDto, 'stepNo' | 'text'>,
  check: { checkedBy: string; checkedAt: string },
): string {
  const text = `Work instruction "${instruction.title}" v${instruction.revisionNo}, step ${step.stepNo}: ${step.text}. `
    + `Recorded by ${check.checkedBy} at ${check.checkedAt}.`
  return text.slice(0, 2000)
}

/** The run's open or closed nonconformity raised for that value, if any; a cancelled one does not count (R8). */
export function ncrForValue<T extends { productionRunId: string | null; title: string; status: string }>(
  ncrs: T[],
  runId: string,
  title: string,
): T | undefined {
  return ncrs.find((ncr) => ncr.productionRunId === runId && ncr.title === title && ncr.status !== 'cancelled')
}
