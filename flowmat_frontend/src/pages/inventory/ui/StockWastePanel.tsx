import { useState } from 'react'
import { useStockWasteQuery } from '../../../entities/inventory/api/useStockWaste'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import { wasteCsv } from '../model/wasteModel'

const PERIODS = [30, 90, 365] as const
const cell = { padding: '4px 6px' } as const
const num = { ...cell, textAlign: 'right', whiteSpace: 'nowrap' } as const

/**
 * Stock lost in the last days, by why (docs/domain/stock-analysis.md "폐기·손실"): written off as expired, scrapped from
 * a defect, or missing at a stock count. Reversed movements are left out; values use today's unit costs.
 */
export function StockWastePanel({ projectId }: { projectId: string }) {
  const [days, setDays] = useState<number>(30)
  const wasteQuery = useStockWasteQuery(projectId, days)
  const waste = wasteQuery.data

  function download() {
    if (!waste) return
    const url = URL.createObjectURL(new Blob([wasteCsv(waste.lines)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `waste-${days}d-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section aria-label="Waste" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 13 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <strong>Waste</strong>
        <select aria-label="Waste period" value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ fontSize: 12 }}>
          {PERIODS.map((period) => <option key={period} value={period}>last {period} days</option>)}
        </select>
        {waste && (
          <span aria-label="Waste value">
            value <strong>{formatQty(waste.value)}</strong> · expired {formatQty(waste.expiredValue)} · defects {formatQty(waste.defectValue)} · count
            losses {formatQty(waste.countLossValue)}
            {waste.valueComplete ? '' : ' (items without a unit cost left out)'}
          </span>
        )}
        <button type="button" style={{ fontSize: 11, marginLeft: 'auto' }} disabled={!waste || waste.lines.length === 0} onClick={download}>
          Download CSV
        </button>
      </div>
      {wasteQuery.isError && <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(wasteQuery.error, 'Failed to add up the waste.')}</p>}
      {waste && waste.lines.length === 0 && <p className="inspector-hint" style={{ margin: '6px 0 0' }}>Nothing written off or lost in this period.</p>}
      {waste && waste.lines.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 6 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th style={cell}>Item</th>
              <th style={num}>Expired</th>
              <th style={num}>Defects</th>
              <th style={num}>Count losses</th>
              <th style={num}>Total</th>
              <th style={num}>Value</th>
            </tr>
          </thead>
          <tbody>
            {waste.lines.map((line) => (
              <tr key={line.itemId} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={cell}>{line.itemCode ?? line.itemId} · {line.itemName ?? ''}</td>
                <td style={num}>{line.expired ? formatQty(line.expired) : '-'}</td>
                <td style={num}>{line.defect ? formatQty(line.defect) : '-'}</td>
                <td style={num}>{line.countLoss ? formatQty(line.countLoss) : '-'}</td>
                <td style={{ ...num, fontWeight: 600 }}>{formatQty(line.total)} {line.unit ?? ''}</td>
                <td style={num}>{formatQty(line.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
