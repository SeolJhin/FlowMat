import { useRunQualityChecklistQuery } from '../../../entities/quality/api/useInspectionStandards'
import { checklistSummary, limitsText } from '../../../entities/quality/model/standardModel'
import { errorMessage } from '../../../shared/lib/errorMessage'

const STATUS = {
  missing: { label: 'Not checked', color: '#b45309' },
  pass: { label: '✓ Pass', color: '#166534' },
  fail: { label: '✕ Fail', color: '#b91c1c' },
} as const

/**
 * The inspection standards of what this run makes and how each went (docs/domain/inspection-standard.md). Shows
 * nothing when those items have no standards.
 */
export function RunQualityChecklist({ projectId, productionRunId }: { projectId: string; productionRunId: string }) {
  const checklistQuery = useRunQualityChecklistQuery(projectId, productionRunId)
  const checklist = checklistQuery.data
  if (checklistQuery.isError) {
    return <p role="alert" style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(checklistQuery.error, 'Failed to load the checklist.')}</p>
  }
  if (!checklist || checklist.lines.length === 0) return null
  const attention = checklist.requiredMissing > 0 || checklist.failed > 0
  return (
    <section aria-label="Quality checklist" style={{ marginBottom: 12 }}>
      <h4 style={{ margin: '0 0 4px' }}>Checklist</h4>
      <p role="status" style={{ margin: '0 0 6px', fontSize: 13, color: attention ? '#b45309' : '#166534' }}>
        {checklistSummary(checklist)}
      </p>
      <table aria-label="Checks for this run" style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left' }}><th>Item</th><th>Check</th><th>Limits</th><th>Required</th><th>Result</th></tr>
        </thead>
        <tbody>
          {checklist.lines.map((line) => (
            <tr key={line.standardId}>
              <td>{line.itemCode ?? line.itemId}</td>
              <td>{line.inspectionType}</td>
              <td>{limitsText(line.standardMin, line.standardMax, line.unit)}</td>
              <td>{line.required ? 'yes' : 'no'}</td>
              <td style={{ color: STATUS[line.status].color }}>
                {STATUS[line.status].label}
                {line.measuredValue !== null && ` (${line.measuredValue}${line.unit ? ` ${line.unit}` : ''})`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
