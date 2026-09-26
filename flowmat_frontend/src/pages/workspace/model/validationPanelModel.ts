import type { WorkflowValidationIssue } from '../../../entities/workflow/api/useWorkflowValidationQuery'

export function sortedValidationIssues(issues: WorkflowValidationIssue[]): WorkflowValidationIssue[] {
  return [...issues].sort((left, right) =>
    Number(left.severity === 'warning') - Number(right.severity === 'warning'))
}

export function validationSelection(issue: WorkflowValidationIssue):
  | { kind: 'connection'; id: string }
  | { kind: 'process'; id: string; ioId: string | null }
  | null {
  if (issue.connectionId) return { kind: 'connection', id: issue.connectionId }
  if (issue.processId) return { kind: 'process', id: issue.processId, ioId: issue.ioId }
  return null
}
