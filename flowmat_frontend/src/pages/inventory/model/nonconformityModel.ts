import type {
  NcrActionInput,
  NcrActionType,
  NcrCreateInput,
  NcrDisposition,
  NcrVerification,
  NonconformityDto,
} from '../../../entities/quality/api/useNonconformities'
import type { DefectSeverity } from '../../../shared/types/api'

export const DISPOSITIONS: NcrDisposition[] = ['pending', 'use_as_is', 'rework', 'scrap', 'return_to_supplier']

export const DISPOSITION_LABELS: Record<NcrDisposition, string> = {
  pending: 'Not decided',
  use_as_is: 'Use as is',
  rework: 'Rework',
  scrap: 'Scrap',
  return_to_supplier: 'Return to supplier',
}

export const ACTION_TYPES: NcrActionType[] = ['correction', 'corrective', 'preventive']

export const ACTION_TYPE_LABELS: Record<NcrActionType, string> = {
  correction: 'Correction (fix this case)',
  corrective: 'Corrective (remove the cause)',
  preventive: 'Preventive (elsewhere)',
}

/**
 * What still stops the nonconformity from being closed, in the server's order; empty when it can be closed. Mirrors
 * NonconformityService.close so the button can say why before anything is sent.
 */
export function closeBlockers(ncr: Pick<NonconformityDto, 'rootCause' | 'disposition' | 'actions'>): string[] {
  const blockers: string[] = []
  if (!ncr.rootCause) blockers.push('Record the root cause.')
  if (ncr.disposition === 'pending') blockers.push('Decide the disposition.')
  const open = ncr.actions.filter((action) => action.status === 'open').length
  if (open > 0) blockers.push(`Finish or cancel ${open} open ${open === 1 ? 'action' : 'actions'}.`)
  if (!ncr.actions.some((action) => action.status === 'done')) blockers.push('Complete at least one action.')
  return blockers
}

/** e.g. "1 of 2 done"; cancelled actions do not count; "no actions" when there are none to do. */
export function actionProgress(ncr: Pick<NonconformityDto, 'actions'>): string {
  const counted = ncr.actions.filter((action) => action.status !== 'cancelled')
  if (counted.length === 0) return 'no actions'
  return `${counted.filter((action) => action.status === 'done').length} of ${counted.length} done`
}

/** What the nonconformity is about, e.g. "MALT · LOT L-7 · run R-3"; empty when nothing is named. */
export function subjectText(ncr: Pick<NonconformityDto, 'itemCode' | 'lotNo' | 'runNumber'>): string {
  return [ncr.itemCode, ncr.lotNo ? `LOT ${ncr.lotNo}` : null, ncr.runNumber ? `run ${ncr.runNumber}` : null]
    .filter(Boolean)
    .join(' · ')
}

export interface NcrForm {
  title: string
  description: string
  severity: DefectSeverity | ''
  defectLogIds: string[]
  /** Raised because another nonconformity's actions did not work: about what that one was about. */
  followUp?: { ncrNo: string; about: string; itemId: string | null; lotId: string | null; productionRunId: string | null }
}

export const EMPTY_NCR_FORM: NcrForm = { title: '', description: '', severity: '', defectLogIds: [] }

export function ncrPayload(form: NcrForm): { input: NcrCreateInput; error: null } | { input: null; error: string } {
  const title = form.title.trim()
  if (!title) return { input: null, error: 'Give the nonconformity a title.' }
  if (title.length > 200) return { input: null, error: 'The title is longer than 200 characters.' }
  if (form.description.trim().length > 2000) return { input: null, error: 'The description is longer than 2000 characters.' }
  return {
    input: {
      title,
      description: form.description.trim() || null,
      severity: form.severity || null,
      defectLogIds: form.defectLogIds,
      ...(form.followUp
        ? { itemId: form.followUp.itemId, lotId: form.followUp.lotId, productionRunId: form.followUp.productionRunId }
        : {}),
    },
    error: null,
  }
}

export interface ActionForm {
  actionType: NcrActionType
  description: string
  ownerId: string
  dueDate: string
}

export const EMPTY_ACTION_FORM: ActionForm = { actionType: 'corrective', description: '', ownerId: '', dueDate: '' }

export function actionPayload(form: ActionForm): { input: NcrActionInput; error: null } | { input: null; error: string } {
  const description = form.description.trim()
  if (!description) return { input: null, error: 'Say what the action is.' }
  if (description.length > 1000) return { input: null, error: 'The action is longer than 1000 characters.' }
  if (form.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.dueDate)) return { input: null, error: 'The due date is not a date.' }
  return {
    input: { actionType: form.actionType, description, ownerId: form.ownerId.trim() || null, dueDate: form.dueDate || null },
    error: null,
  }
}

/** A new nonconformity for what a closed one's actions did not fix (N12): same subject and severity, no defects yet. */
export function followUpForm(
  ncr: Pick<NonconformityDto, 'ncrNo' | 'title' | 'severity' | 'verificationNote' | 'itemId' | 'itemCode' | 'lotId' | 'lotNo'
    | 'productionRunId' | 'runNumber'>,
): NcrForm {
  return {
    title: `Follow-up to ${ncr.ncrNo}: ${ncr.title}`.slice(0, 200),
    description: `The actions of ${ncr.ncrNo} did not work.${ncr.verificationNote ? ` ${ncr.verificationNote}` : ''}`.slice(0, 2000),
    severity: ncr.severity,
    defectLogIds: [],
    followUp: { ncrNo: ncr.ncrNo, about: subjectText(ncr), itemId: ncr.itemId, lotId: ncr.lotId, productionRunId: ncr.productionRunId },
  }
}

/** How many days after closing the close form suggests checking the actions (N13); the day can be changed or cleared. */
export const CHECK_AFTER_DAYS = 30

/** The YYYY-MM-DD day a number of days after another. */
export function addDays(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, date + days)).toISOString().slice(0, 10)
}

/** A check date before it is sent: empty for none, otherwise the project's today or later (N13). */
export function checkDate(value: string, today: string): { day: string | null; error: null } | { day: null; error: string } {
  if (!value) return { day: null, error: null }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return { day: null, error: 'The check date is not a date.' }
  if (value < today) return { day: null, error: 'The check date is before today.' }
  return { day: value, error: null }
}

/**
 * When a closed nonconformity's actions are due to be checked, e.g. "check by 2026-11-10" or "check overdue (due
 * 2026-11-10)"; empty once they are checked or when no day was set.
 */
export function checkDueText(
  ncr: Pick<NonconformityDto, 'status' | 'verificationResult' | 'verificationDueDate' | 'verificationOverdue'>,
): string {
  if (ncr.status !== 'closed' || ncr.verificationResult || !ncr.verificationDueDate) return ''
  return ncr.verificationOverdue ? `check overdue (due ${ncr.verificationDueDate})` : `check by ${ncr.verificationDueDate}`
}

/** Checks whether the actions worked before it is sent: a "no" says what still goes wrong. */
export function verificationPayload(
  result: NcrVerification | '',
  note: string,
): { input: { result: NcrVerification; note: string | null }; error: null } | { input: null; error: string } {
  if (!result) return { input: null, error: 'Say whether the actions worked.' }
  const text = note.trim()
  if (result === 'not_effective' && !text) return { input: null, error: 'Say what still goes wrong.' }
  return { input: { result, note: text || null }, error: null }
}
