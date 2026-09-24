import { useState } from 'react'
import { useStockAlertsQuery } from '../../../entities/inventory/api/useStockAlerts'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import type { StockAlertDto } from '../../../shared/types/api'
import { describeAlert, orderAlerts } from '../model/stockAlertModel'

const SEVERITY_STYLE: Record<StockAlertDto['severity'], { fg: string; bg: string }> = {
  critical: { fg: '#991b1b', bg: '#fee2e2' },
  warning: { fg: '#92400e', bg: '#fef3c7' },
  info: { fg: '#1e40af', bg: '#dbeafe' },
}

/**
 * Open stock alerts above the stock table (docs/domain/stock-alert.md). They close by themselves once the stock is back
 * inside its thresholds; "History" shows the closed ones too. The one-line header stays when nothing is open, so the
 * history can still be reached.
 */
export function StockAlerts({ projectId, onShowRow }: { projectId: string; onShowRow: (inventoryId: string) => void }) {
  const [history, setHistory] = useState(false)
  const alertsQuery = useStockAlertsQuery(projectId, !history)
  const alerts = orderAlerts(alertsQuery.data ?? [])

  if (alertsQuery.isError) {
    return <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(alertsQuery.error, 'Failed to load stock alerts.')}</p>
  }
  const title = history
    ? 'Stock alert history'
    : alerts.length === 0
      ? 'No open stock alerts'
      : `${alerts.length} stock alert${alerts.length === 1 ? '' : 's'}`

  return (
    <section aria-label="Stock alerts" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <strong style={{ fontSize: 13, opacity: !history && alerts.length === 0 ? 0.6 : 1 }}>{title}</strong>
        <button type="button" style={{ fontSize: 11 }} aria-pressed={history} onClick={() => setHistory((h) => !h)}>
          {history ? 'Open only' : 'History'}
        </button>
      </div>
      {history && alerts.length === 0 && <p className="inspector-hint">No alerts yet.</p>}
      <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'grid', gap: 6, fontSize: 12 }}>
        {alerts.map((alert) => {
          const style = SEVERITY_STYLE[alert.severity] ?? SEVERITY_STYLE.warning
          return (
            <li
              key={alert.stockAlertId}
              aria-label={`${alert.alertType} stock ${alert.itemCode ?? alert.itemId}`}
              style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', opacity: alert.resolved ? 0.6 : 1 }}
            >
              <span style={{ background: style.bg, color: style.fg, borderRadius: 999, padding: '1px 8px', fontWeight: 600 }}>
                {alert.resolved ? 'closed' : alert.severity}
              </span>
              <span style={{ flex: 1, minWidth: 200 }}>{describeAlert(alert, formatQty)}</span>
              <span style={{ opacity: 0.6 }}>{new Date(alert.triggeredAt).toLocaleString()}</span>
              <button type="button" style={{ fontSize: 11 }} onClick={() => onShowRow(alert.inventoryId)}>
                Movements
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
