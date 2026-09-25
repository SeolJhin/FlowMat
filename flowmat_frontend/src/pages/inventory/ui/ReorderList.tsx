import { useStockAnalysisQuery } from '../../../entities/inventory/api/useStockAnalysis'
import { useReorderListQuery } from '../../../entities/inventory/api/useStockAlerts'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import { coverLabel } from '../model/stockAnalysisModel'
import { suggestedOrder } from '../model/stockAlertModel'

const cell = { padding: '4px 6px' } as const
const num = { ...cell, textAlign: 'right' } as const
/** The use rate the cover and the suggestion are worked out from. */
const USE_DAYS = 30

/**
 * Items whose usable stock over all their records is below their safety stock (docs/domain/stock-alert.md "재주문 목록"),
 * biggest shortfall first. Hidden when nothing is short; safety stock is set on the item. How long the stock lasts and
 * how much to order come from the last 30 days of use (docs/domain/stock-analysis.md).
 */
export function ReorderList({ projectId }: { projectId: string }) {
  const reorderQuery = useReorderListQuery(projectId)
  const lines = reorderQuery.data ?? []
  const analysisQuery = useStockAnalysisQuery(projectId, USE_DAYS, lines.length > 0)
  const use = new Map((analysisQuery.data?.lines ?? []).map((line) => [line.itemId, line]))

  if (reorderQuery.isError) {
    return <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(reorderQuery.error, 'Failed to load the reorder list.')}</p>
  }
  if (lines.length === 0) return null

  return (
    <section aria-label="Below safety stock" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, marginBottom: 16 }}>
      <strong style={{ fontSize: 13 }}>
        {lines.length} item{lines.length === 1 ? '' : 's'} below safety stock
      </strong>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 6 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
            <th style={cell}>Item</th>
            <th style={num}>Usable</th>
            <th style={num}>Safety stock</th>
            <th style={num}>Short</th>
            <th style={num}>Lead time</th>
            <th style={num} title={`At the last ${USE_DAYS} days' use`}>
              Lasts
            </th>
            <th style={num} title="Shortfall plus what is used during the lead time">
              Suggested order
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const usage = use.get(line.itemId)
            return (
              <tr key={line.itemId} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={cell}>
                  {line.itemCode} · {line.itemName}
                </td>
                <td style={num}>
                  {formatQty(line.availableQuantity)} {line.unit ?? ''}
                </td>
                <td style={num}>{formatQty(line.safetyStockQty)}</td>
                <td style={{ ...num, color: '#b91c1c', fontWeight: 600 }}>{formatQty(line.shortageQuantity)}</td>
                <td style={num}>{line.leadTimeDays != null ? `${line.leadTimeDays} d` : '-'}</td>
                <td style={{ ...num, color: usage?.coverBelowLeadTime ? '#b45309' : undefined }}>
                  {usage ? coverLabel(usage) : '-'}
                </td>
                <td style={{ ...num, fontWeight: 600 }}>
                  {formatQty(suggestedOrder(line, usage?.averageDailyConsumption))} {line.unit ?? ''}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
