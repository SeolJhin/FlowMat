import { useItemsQuery } from '../../../entities/catalog/api/useItemsQuery'
import { useMaterialRequirementsQuery } from '../../../entities/production/api/useMaterialRequirements'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import { isActiveItem } from '../model/itemStatusModel'
import { needsCsv, packsFor } from '../model/stockAlertModel'

const cell = { padding: '4px 6px' } as const
const num = { ...cell, textAlign: 'right', whiteSpace: 'nowrap' } as const

/**
 * What open work orders still need (docs/domain/material-requirements.md): the materials short against usable stock
 * first, with the orders that need them. Hidden when no open order has a BOM.
 */
export function OpenOrderNeeds({ projectId }: { projectId: string }) {
  const needsQuery = useMaterialRequirementsQuery(projectId)
  const needs = needsQuery.data
  const itemById = new Map((useItemsQuery(projectId).data ?? []).map((item) => [item.itemId, item]))
  if (needsQuery.isError) {
    return <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(needsQuery.error, 'Failed to add up open work orders.')}</p>
  }
  if (!needs || (needs.orders === 0 && needs.problems.length === 0)) return null
  const short = needs.lines.filter((line) => line.shortage > 0)

  function download() {
    if (!needs) return
    const url = URL.createObjectURL(new Blob([needsCsv(needs.lines, itemById)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `work-order-needs-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section aria-label="Open work order needs" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <strong style={{ fontSize: 13, color: short.length ? '#b91c1c' : undefined }}>
          {short.length === 0
            ? `${needs.orders} open work order${needs.orders === 1 ? '' : 's'}: all ${needs.lines.length} materials covered`
            : `${needs.orders} open work order${needs.orders === 1 ? '' : 's'}: ${short.length} material${short.length === 1 ? '' : 's'} short`}
        </strong>
        {needs.lines.length > 0 && (
          <button type="button" style={{ fontSize: 11, marginLeft: 'auto' }} onClick={download}>
            Download CSV
          </button>
        )}
      </div>
      {needs.problems.length > 0 && (
        <p role="note" style={{ color: '#b45309', fontSize: 12, margin: '4px 0 0' }}>
          Not counted: {needs.problems.join('; ')}
        </p>
      )}
      <details open={short.length > 0} style={{ marginTop: 6 }}>
        <summary style={{ cursor: 'pointer', fontSize: 12 }}>{short.length > 0 ? 'Materials' : 'Show all materials'}</summary>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 6 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th style={cell}>Material</th>
              <th style={num}>Needed</th>
              <th style={num}>Usable</th>
              <th style={num}>Short</th>
              <th style={cell}>For</th>
            </tr>
          </thead>
          <tbody>
            {needs.lines.map((line) => (
              <tr key={line.itemId} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={cell}>
                  {line.itemCode} · {line.itemName}
                  {(() => {
                    // A shortage of an item that takes no new stock cannot be ordered away (docs/domain/item-status.md).
                    const item = itemById.get(line.itemId)
                    return item && !isActiveItem(item) ? (
                      <span style={{ display: 'block', fontSize: 11, color: '#b45309' }}>{item.itemStatus}: not reordered</span>
                    ) : null
                  })()}
                </td>
                <td style={num}>
                  {formatQty(line.required)} {line.unit ?? ''}
                </td>
                <td style={num}>{formatQty(line.usable)}</td>
                <td style={{ ...num, color: line.shortage ? '#b91c1c' : undefined, fontWeight: line.shortage ? 600 : 400 }}>
                  {line.shortage ? formatQty(line.shortage) : '-'}
                  {line.shortage > 0 && itemById.get(line.itemId)?.purchaseUnit && (
                    <div className="inspector-hint" style={{ fontWeight: 400 }}>
                      {packsFor(line.shortage, itemById.get(line.itemId)?.purchaseUnitQty)} {itemById.get(line.itemId)?.purchaseUnit}
                    </div>
                  )}
                </td>
                <td style={{ ...cell, opacity: 0.8 }}>
                  {line.orders.map((order) => `${order.workOrderTitle} ${formatQty(order.required)}`).join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}
