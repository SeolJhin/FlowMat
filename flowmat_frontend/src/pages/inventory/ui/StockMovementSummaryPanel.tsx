import { useState } from 'react'
import { useStockMovementSummaryQuery } from '../../../entities/inventory/api/useStockMovementSummary'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import { defaultPeriod, movementSummaryCsv, periodBounds } from '../model/movementSummaryModel'

const cell = { padding: '6px 6px' } as const
const num = { ...cell, textAlign: 'right', whiteSpace: 'nowrap' } as const
const head = { ...cell, textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 600 } as const

/** A number, or a dash for zero so the movements that happened stand out. */
function qty(value: number): string {
  return value === 0 ? '-' : formatQty(value)
}

/**
 * Each item's stock over a period (docs/domain/stock-ledger.md): opening, what came in and went out by kind, closing.
 * Opening + in − out + moved + corrected = closing, from the same ledger as the movement list.
 */
export function StockMovementSummaryPanel({ projectId }: { projectId: string }) {
  const [dates, setDates] = useState(defaultPeriod())
  const period = periodBounds(dates.fromDate, dates.toDate)
  const summaryQuery = useStockMovementSummaryQuery(projectId, period)
  const lines = summaryQuery.data?.lines ?? []
  const unexplained = lines.filter((line) => line.unexplained !== 0)

  function download() {
    const url = URL.createObjectURL(new Blob([movementSummaryCsv(lines)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `stock-summary-${dates.fromDate}-to-${dates.toDate}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section aria-label="Stock summary by item" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap', fontSize: 12 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>From</span>
          <input type="date" value={dates.fromDate} onChange={(e) => setDates((d) => ({ ...d, fromDate: e.target.value }))} />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>To</span>
          <input type="date" value={dates.toDate} onChange={(e) => setDates((d) => ({ ...d, toDate: e.target.value }))} />
        </label>
        <button type="button" disabled={lines.length === 0} onClick={download}>
          Download CSV
        </button>
        <span className="inspector-hint">Both days included. Opening + in − out ± moved and corrected = closing.</span>
      </div>
      {!period && <p style={{ color: '#dc2626', fontSize: 12, margin: 0 }}>Pick a start day on or before the end day.</p>}
      {summaryQuery.isError && (
        <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(summaryQuery.error, 'Failed to add up the period.')}</p>
      )}
      {summaryQuery.data && lines.length === 0 && <p className="inspector-hint">No stock and no movements in this period.</p>}
      {unexplained.length > 0 && (
        <p role="note" style={{ color: '#b45309', fontSize: 12, margin: 0 }}>
          {unexplained.length} item{unexplained.length === 1 ? '' : 's'} changed outside the ledger (records from before it); their
          closing does not add up.
        </p>
      )}
      {lines.length > 0 && (
        <table aria-label="Stock summary" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...head, textAlign: 'left' }}>Item</th>
              <th style={head}>Opening</th>
              <th style={head}>Received</th>
              <th style={head}>Produced</th>
              <th style={head}>Issued</th>
              <th style={head}>Used</th>
              <th style={head} title="Transfers in less transfers out">Moved</th>
              <th style={head} title="Adjustments and reversals">Corrected</th>
              <th style={head}>Closing</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.itemId} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={cell}>
                  <code>{line.itemCode}</code> {line.itemName}
                  {line.unit && <span style={{ opacity: 0.6 }}> ({line.unit})</span>}
                </td>
                <td style={num}>{qty(line.opening)}</td>
                <td style={{ ...num, color: line.received ? '#047857' : undefined }}>{qty(line.received)}</td>
                <td style={{ ...num, color: line.produced ? '#047857' : undefined }}>{qty(line.produced)}</td>
                <td style={{ ...num, color: line.issued ? '#b91c1c' : undefined }}>{qty(line.issued)}</td>
                <td style={{ ...num, color: line.consumed ? '#b91c1c' : undefined }}>{qty(line.consumed)}</td>
                <td style={num}>{qty(line.transferred)}</td>
                <td style={num}>{qty(line.corrected)}</td>
                <td style={{ ...num, fontWeight: 600 }} title={line.unexplained ? `Does not add up by ${formatQty(line.unexplained)}` : undefined}>
                  {formatQty(line.closing)}
                  {line.unexplained !== 0 && <span style={{ color: '#b45309' }}> *</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
