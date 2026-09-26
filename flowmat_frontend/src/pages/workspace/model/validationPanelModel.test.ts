import { describe, expect, it } from 'vitest'
import type { WorkflowValidationIssue } from '../../../entities/workflow/api/useWorkflowValidationQuery'
import { sortedValidationIssues, validationSelection } from './validationPanelModel'

const issue = (severity: 'error' | 'warning', code: string): WorkflowValidationIssue => ({
  severity, code, processId: null, ioId: null, connectionId: null, message: code,
})

describe('validation panel', () => {
  it('places errors before warnings without mutating the API result', () => {
    const original = [issue('warning', 'CYCLE'), issue('error', 'CONNECTION_ORPHAN')]
    expect(sortedValidationIssues(original).map((entry) => entry.code))
      .toEqual(['CONNECTION_ORPHAN', 'CYCLE'])
    expect(original[0].code).toBe('CYCLE')
  })

  it('resolves connection and port selection targets', () => {
    expect(validationSelection({ ...issue('error', 'X'), connectionId: 'connection-1' }))
      .toEqual({ kind: 'connection', id: 'connection-1' })
    expect(validationSelection({ ...issue('error', 'X'), processId: 'process-1', ioId: 'port-1' }))
      .toEqual({ kind: 'process', id: 'process-1', ioId: 'port-1' })
    expect(validationSelection(issue('warning', 'CYCLE'))).toBeNull()
  })
})
