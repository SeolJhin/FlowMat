import { useState } from 'react'
import { useStockTransfersQuery } from '../../../entities/inventory/api/useStockTransfers'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { placeTraffic, routeItemsText, routeText } from '../model/transferAnalysisModel'

const PERIODS = [30, 90, 365] as const
const cell = { padding: '4px 6px' } as const
const num = { ...cell, textAlign: 'right', whiteSpace: 'nowrap' } as const

/**
 * Stock moved between places in the last days (docs/domain/stock-analysis.md "위치 간 이동"), per route with the items
 * moved along it, and the places handled most. Every transfer counts, warehouse tasks included. Loaded only when opened.
 */
export function StockTransfersPanel({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false)
  const [days, setDays] = useState<number>(30)
  const query = useStockTransfersQuery(open ? projectId : '', days)
  const transfers = query.data
  const busiest = transfers ? placeTraffic(transfers.routes).slice(0, 3) : []

  return (
    <details
      aria-label="Moves between places"
      style={{ marginBottom: 16, fontSize: 13 }}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary style={{ cursor: 'pointer' }}>Moves between places</summary>
      {open && (
        <div style={{ marginTop: 6 }}>
          <select aria-label="Moves period" value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ fontSize: 12 }}>
            {PERIODS.map((period) => <option key={period} value={period}>last {period} days</option>)}
          </select>
          {query.isError && <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(query.error, 'Failed to add up the moves.')}</p>}
          {transfers && transfers.routes.length === 0 && (
            <p className="inspector-hint" style={{ margin: '6px 0 0' }}>No stock moved between places in this period.</p>
          )}
          {busiest.length > 0 && (
            <p aria-label="Busiest places" style={{ margin: '6px 0 0' }}>
              Busiest: {busiest.map((place) => `${place.place ?? 'no place'} ${place.out} out · ${place.in} in`).join('; ')}
            </p>
          )}
          {transfers && transfers.routes.length > 0 && (
            <table aria-label="Moves by route" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 6 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={cell}>Route</th>
                  <th style={num}>Moves</th>
                  <th style={cell}>Items</th>
                </tr>
              </thead>
              <tbody>
                {transfers.routes.map((route) => (
                  <tr key={routeText(route)} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={cell}>{routeText(route)}</td>
                    <td style={num}>{route.moves}</td>
                    <td style={{ ...cell, opacity: 0.85 }}>{routeItemsText(route)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </details>
  )
}
