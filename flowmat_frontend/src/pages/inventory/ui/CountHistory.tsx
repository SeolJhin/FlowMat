import { useInventoryCountHistoryQuery } from '../../../entities/inventory/api/useInventoryCount'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'

const cell = { padding: '4px 6px' } as const
const num = { ...cell, textAlign: 'right', whiteSpace: 'nowrap' } as const

function signed(value: number): string {
  return value > 0 ? `+${formatQty(value)}` : formatQty(value)
}

/**
 * Past counts, newest first (docs/domain/stock-count.md "실사 이력"): when, by whom, what they changed and what that is
 * worth at today's unit costs. Open one to see its records. Records counted without a difference are not listed.
 */
export function CountHistory({ projectId }: { projectId: string }) {
  const historyQuery = useInventoryCountHistoryQuery(projectId)
  const counts = historyQuery.data ?? []

  return (
    <section aria-label="Past counts" style={{ marginTop: 24 }}>
      <h4 style={{ margin: '0 0 6px' }}>Past counts</h4>
      {historyQuery.isError && (
        <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(historyQuery.error, 'Failed to load past counts.')}</p>
      )}
      {historyQuery.data && counts.length === 0 && <p className="inspector-hint">No count has changed any stock yet.</p>}
      {counts.map((count) => (
        <details key={count.countId} style={{ borderBottom: '1px solid var(--border)', padding: '6px 0', fontSize: 13 }}>
          <summary style={{ cursor: 'pointer' }}>
            {new Date(count.countedAt).toLocaleString()} · {count.countedBy ?? '?'} · {count.adjusted} record
            {count.adjusted === 1 ? '' : 's'} changed <span style={{ color: '#047857' }}>+{formatQty(count.increase)}</span> /{' '}
            <span style={{ color: '#b91c1c' }}>-{formatQty(count.decrease)}</span> · value{' '}
            <strong style={{ color: count.valueChange < 0 ? '#b91c1c' : count.valueChange > 0 ? '#047857' : undefined }}>
              {signed(count.valueChange)}
            </strong>
            {!count.valueComplete && <span style={{ opacity: 0.6 }}> (some items have no unit cost)</span>}
            {count.note && <span style={{ opacity: 0.7 }}> · {count.note}</span>}
          </summary>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 6 }}>
            <tbody>
              {count.lines.map((line) => (
                <tr key={line.inventoryId} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={cell}>
                    <code>{line.itemCode}</code> {line.itemName}
                  </td>
                  <td style={cell}>{line.location ?? '-'}</td>
                  <td style={cell}>{line.lotNo ?? '-'}</td>
                  <td style={{ ...num, color: line.difference < 0 ? '#b91c1c' : '#047857' }}>
                    {signed(line.difference)} {line.unit ?? ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ))}
    </section>
  )
}
