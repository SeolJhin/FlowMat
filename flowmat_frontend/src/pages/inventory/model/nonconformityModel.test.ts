import { describe, expect, it } from 'vitest'
import type { NcrAction, NonconformityDto } from '../../../entities/quality/api/useNonconformities'
import {
  EMPTY_ACTION_FORM,
  EMPTY_NCR_FORM,
  actionPayload,
  actionProgress,
  closeBlockers,
  followUpForm,
  ncrPayload,
  subjectText,
  verificationPayload,
} from './nonconformityModel'

function action(status: NcrAction['status'], actionNo = 1): NcrAction {
  return {
    correctiveActionId: `a${actionNo}`, actionNo, actionType: 'corrective', description: 'x', ownerId: null, dueDate: null, status,
    resultNote: null, createdBy: 'u', createdAt: '2026-09-01T00:00:00Z', finishedBy: null, finishedAt: null, overdue: false,
  }
}

const base: Pick<NonconformityDto, 'rootCause' | 'disposition' | 'actions'> = { rootCause: null, disposition: 'pending', actions: [] }

describe('closeBlockers', () => {
  it('names everything missing in the order the server checks it', () => {
    expect(closeBlockers(base)).toEqual([
      'Record the root cause.', 'Decide the disposition.', 'Complete at least one action.',
    ])
    expect(closeBlockers({ rootCause: 'Worn mould', disposition: 'rework', actions: [action('done'), action('open', 2), action('open', 3)] }))
      .toEqual(['Finish or cancel 2 open actions.'])
    expect(closeBlockers({ rootCause: 'Worn mould', disposition: 'scrap', actions: [action('done'), action('cancelled', 2)] })).toEqual([])
  })
})

describe('actionProgress and subjectText', () => {
  it('counts done actions and leaves cancelled ones out', () => {
    expect(actionProgress({ actions: [] })).toBe('no actions')
    expect(actionProgress({ actions: [action('done'), action('open', 2), action('cancelled', 3)] })).toBe('1 of 2 done')
    expect(actionProgress({ actions: [action('cancelled')] })).toBe('no actions')
  })

  it('names the item, LOT and run it is about', () => {
    expect(subjectText({ itemCode: 'MALT', lotNo: 'L-7', runNumber: 'R-3' })).toBe('MALT · LOT L-7 · run R-3')
    expect(subjectText({ itemCode: null, lotNo: null, runNumber: null })).toBe('')
  })
})

describe('payloads', () => {
  it('trims the forms and names what is missing', () => {
    expect(ncrPayload(EMPTY_NCR_FORM).error).toBe('Give the nonconformity a title.')
    expect(ncrPayload({ ...EMPTY_NCR_FORM, title: ' Cracks ', defectLogIds: ['d1'] }).input).toEqual({
      title: 'Cracks', description: null, severity: null, defectLogIds: ['d1'],
    })
    expect(actionPayload(EMPTY_ACTION_FORM).error).toBe('Say what the action is.')
    expect(actionPayload({ ...EMPTY_ACTION_FORM, description: 'Swap mould', dueDate: '2026-10-01', ownerId: ' ' }).input).toEqual({
      actionType: 'corrective', description: 'Swap mould', ownerId: null, dueDate: '2026-10-01',
    })
  })
})

describe('checking whether the actions worked', () => {
  it('asks for a result, and for what still goes wrong after a no', () => {
    expect(verificationPayload('', 'x').error).toBe('Say whether the actions worked.')
    expect(verificationPayload('not_effective', ' ').error).toBe('Say what still goes wrong.')
    expect(verificationPayload('not_effective', ' Cracks again ').input).toEqual({ result: 'not_effective', note: 'Cracks again' })
    expect(verificationPayload('effective', ' ').input).toEqual({ result: 'effective', note: null })
  })

  it('raises a follow-up about the same thing, with the same severity', () => {
    const form = followUpForm({
      ncrNo: 'NCR-0007', title: 'Cracked housings', severity: 'major', verificationNote: 'Cracks again on lot 57',
      itemId: 'housing', itemCode: 'HOUSING', lotId: 'lot-57', lotNo: 'L57', productionRunId: null, runNumber: null,
    })
    expect(form.title).toBe('Follow-up to NCR-0007: Cracked housings')
    expect(form.description).toBe('The actions of NCR-0007 did not work. Cracks again on lot 57')
    expect(form.followUp?.about).toBe('HOUSING · LOT L57')
    expect(ncrPayload(form).input).toEqual({
      title: 'Follow-up to NCR-0007: Cracked housings', description: 'The actions of NCR-0007 did not work. Cracks again on lot 57',
      severity: 'major', defectLogIds: [], itemId: 'housing', lotId: 'lot-57', productionRunId: null,
    })
    expect(followUpForm({
      ncrNo: 'NCR-0008', title: 'x'.repeat(200), severity: 'minor', verificationNote: null,
      itemId: null, itemCode: null, lotId: null, lotNo: null, productionRunId: null, runNumber: null,
    }).title).toHaveLength(200)
  })
})
