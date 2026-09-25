import { useState } from 'react'
import { useStockSnapshotQuery } from '../../../entities/inventory/api/useStockSnapshot'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import { endOfDay, snapshotCsv, totalsByItem } from '../model/snapshotModel'

const cell = { padding: '6px 6px' } as const
const num = { ...cell, textAlign: 'right', whiteSpace: 'nowrap' } as const
const head = { ...cell, textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: 600 } as const

function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * Stock as it stood when a day closed (docs/domain/stock-ledger.md), for period-end counts and values. Built from the
 * ledger: each record shows what its last movement up to then left. Values use today's unit costs.
 */
export function StockSnapshotPanel({ projectId }: { projectId: string }) {
  const [date, setDate] = useState(today())
  const [byItem, setByItem] = useState(true)
  const at = date ? endOfDay(date) : null
  const snapshotQuery = useStockSnapshotQuery(projectId, at)
  const snapshot = snapshotQuery.data
  const totals = snapshot ? totalsByItem(snapshot.rows) : []

  function download() {
    if (!snapshot) return
    const url = URL.createObjectURL(new Blob([snapshotCsv(snapshot.rows)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `stock-on-${date}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section aria-label="Stock on a date" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap', fontSize: 12 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Stock at the end of</span>
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={byItem} onChange={(e) => setByItem(e.target.checked)} />
          Total per item
        </label>
        <button type="button" disabled={!snapshot || snapshot.rows.length === 0} onClick={download}>
          Download CSV
        </button>
        <span className="inspector-hint">Rebuilt from the stock ledger; values use today&apos;s unit costs.</span>
      </div>

      {snapshotQuery.isError && (
        <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(snapshotQuery.error, 'Failed to rebuild the stock.')}</p>
      )}
      {snapshot && (
        <p aria-label="Stock on a date summary" style={{ margin: 0, fontSize: 13 }}>
          {snapshot.rows.length} record{snapshot.rows.length === 1 ? '' : 's'} of {totals.length} item
          {totals.length === 1 ? '' : 's'} · value <strong>{formatQty(snapshot.totalValue)}</strong>
          {snapshot.valueComplete ? '' : ' (items without a unit cost left out)'}
        </p>
      )}
      {snapshot && snapshot.rows.length === 0 && <p className="inspector-hint">There was no stock at that time.</p>}

      {snapshot && snapshot.rows.length > 0 && byItem && (
        <table aria-label="Stock per item" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={head}>Item</th>
              <th style={{ ...head, textAlign: 'right' }}>Records</th>
              <th style={{ ...head, textAlign: 'right' }}>On hand</th>
              <th style={{ ...head, textAlign: 'right' }}>Reserved</th>
              <th style={{ ...head, textAlign: 'right' }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {totals.map((total) => (
              <tr key={total.itemId} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={cell}>
                  <code>{total.itemCode}</code> {total.itemName}
                </td>
                <td style={num}>{total.records}</td>
                <td style={num}>
                  {formatQty(total.quantity)} {total.unit ?? ''}
                </td>
                <td style={num}>{total.reservedQuantity ? formatQty(total.reservedQuantity) : '-'}</td>
                <td style={{ ...num, opacity: total.value === null ? 0.5 : 1 }}>
                  {total.value === null ? 'no cost' : formatQty(total.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {snapshot && snapshot.rows.length > 0 && !byItem && (
        <table aria-label="Stock per record" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={head}>Item</th>
              <th style={head}>Location</th>
              <th style={head}>LOT</th>
              <th style={{ ...head, textAlign: 'right' }}>On hand</th>
              <th style={{ ...head, textAlign: 'right' }}>Reserved</th>
              <th style={{ ...head, textAlign: 'right' }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.rows.map((row) => (
              <tr key={row.inventoryId} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={cell}>
                  <code>{row.itemCode}</code> {row.itemName}
                </td>
                <td style={cell}>{row.location ?? '-'}</td>
                <td style={cell}>{row.lotNo ?? '-'}</td>
                <td style={num} title={row.fromLedger ? undefined : 'Never moved: the quantity it was created with'}>
                  {formatQty(row.quantity)} {row.unit ?? ''}
                </td>
                <td style={num}>{row.reservedQuantity ? formatQty(row.reservedQuantity) : '-'}</td>
                <td style={{ ...num, opacity: row.value === null ? 0.5 : 1 }}>
                  {row.value === null ? 'no cost' : formatQty(row.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
