import { useInspectionStandardsQuery } from '../api/useInspectionStandards'
import { useQualityInspectionsQuery } from '../api/useQuality'
import { checklistCounts, checklistSummary, limitsText, receiptChecklist } from '../model/standardModel'

const STATUS = {
  missing: { label: 'Not checked', color: '#b45309' },
  pass: { label: '✓ Pass', color: '#166534' },
  fail: { label: '✕ Fail', color: '#b91c1c' },
} as const

/**
 * The receipt checks of a LOT's item and how each went for this LOT (docs/domain/inspection-standard.md). It reads the
 * same standards and LOT inspections as the quality records under it, so it costs no extra request. Shows nothing when
 * the item has no receipt or any-stage checks.
 */
export function ReceiptChecklist({ projectId, lotId, itemId }: { projectId: string; lotId: string; itemId: string }) {
  const standards = useInspectionStandardsQuery(projectId).data ?? []
  const inspections = useQualityInspectionsQuery(projectId, { lotId }).data ?? []
  const lines = receiptChecklist(standards, itemId, inspections)
  if (lines.length === 0) return null
  const counts = checklistCounts(lines)
  const attention = counts.requiredMissing > 0 || counts.failed > 0
  return (
    <section aria-label="Receipt checklist" style={{ marginBottom: 12 }}>
      <h4 style={{ margin: '0 0 4px' }}>Receipt checks</h4>
      <p role="status" style={{ margin: '0 0 6px', fontSize: 13, color: attention ? '#b45309' : '#166534' }}>
        {checklistSummary(counts)}
      </p>
      <table aria-label="Receipt checks for this LOT" style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left' }}><th>Check</th><th>Limits</th><th>Required</th><th>Result</th></tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.standardId}>
              <td>{line.inspectionType}{line.stage === 'any' ? ' (any stage)' : ''}</td>
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
