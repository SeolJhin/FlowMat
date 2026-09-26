import { useMemo, useState } from 'react'
import { useStockSnapshotsQuery } from '../../../entities/inventory/api/useStockSnapshot'
import { formatQty } from '../../../shared/lib/formatQty'
import { trendMoments, withChanges } from '../model/valueTrendModel'

const MONTHS = 6
const cell = { padding: '4px 6px' } as const
const num = { ...cell, textAlign: 'right', whiteSpace: 'nowrap' } as const

/**
 * Stock value at the end of each of the last six months and today, rebuilt from the ledger like "Stock on a date".
 * Values use today's unit costs, so the trend shows quantities moving, not price changes. Loaded only when opened.
 */
export function StockValueTrend({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false)
  const moments = useMemo(() => trendMoments(MONTHS), [])
  const queries = useStockSnapshotsQuery(projectId, open ? moments.map((moment) => moment.at) : [])
  const rows = withChanges(queries.map((query) => query.data?.totalValue ?? null))
  const incomplete = queries.some((query) => query.data && !query.data.valueComplete)

  return (
    <details
      aria-label="Stock value trend"
      style={{ marginBottom: 16, fontSize: 13 }}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary style={{ cursor: 'pointer' }}>Stock value by month</summary>
      {open && (
        <table style={{ borderCollapse: 'collapse', fontSize: 12, marginTop: 6 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={cell}>End of</th>
              <th style={num}>Value</th>
              <th style={num}>Change</th>
              <th style={num}>Records</th>
            </tr>
          </thead>
          <tbody>
            {moments.map((moment, index) => {
              const query = queries[index]
              const value = rows[index]?.value ?? null
              const change = rows[index]?.change ?? null
              return (
                <tr key={moment.at} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={cell}>{moment.label}</td>
                  <td style={num}>{query?.isError ? 'failed' : value === null ? '…' : formatQty(value)}</td>
                  <td style={{ ...num, color: change === null || change === 0 ? undefined : change < 0 ? '#b91c1c' : '#047857' }}>
                    {change === null ? '' : `${change > 0 ? '+' : ''}${formatQty(change)}`}
                  </td>
                  <td style={num}>{query?.data ? query.data.rows.length : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {open && (
        <p className="inspector-hint" style={{ margin: '4px 0 0' }}>
          At today&apos;s unit costs{incomplete ? '; items without a unit cost are left out' : ''}.
        </p>
      )}
    </details>
  )
}
