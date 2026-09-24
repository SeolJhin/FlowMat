import { useState } from 'react'
import { useBomWhereUsedQuery } from '../../../entities/bom/api/useBoms'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import type { ItemDto } from '../../../shared/types/api'

const cell = { padding: '6px 6px' } as const

/**
 * Where an item is used: every BOM revision that has it as a line, approved first. Answers "what does changing or
 * dropping this material affect?". Clicking a row opens that BOM.
 */
export function BomWhereUsed({
  projectId,
  items,
  onOpen,
}: {
  projectId: string
  items: ItemDto[]
  onOpen: (bomId: string) => void
}) {
  const [itemId, setItemId] = useState('')
  const whereUsedQuery = useBomWhereUsedQuery(projectId, itemId || null)
  const rows = whereUsedQuery.data ?? []

  return (
    <section aria-label="Where used" style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
      <h4 style={{ margin: '0 0 6px' }}>Where is a material used?</h4>
      <label style={{ display: 'grid', gap: 4, fontSize: 12, maxWidth: 360 }}>
        <span>Material</span>
        <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
          <option value="">Choose an item...</option>
          {items.map((item) => (
            <option key={item.itemId} value={item.itemId}>
              {item.itemCode} · {item.itemName}
            </option>
          ))}
        </select>
      </label>
      {whereUsedQuery.isError && (
        <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(whereUsedQuery.error, 'Failed to look it up.')}</p>
      )}
      {itemId && !whereUsedQuery.isLoading && rows.length === 0 && (
        <p className="inspector-hint">No BOM uses this item.</p>
      )}
      {rows.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 8 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
              <th style={cell}>Product</th>
              <th style={cell}>BOM</th>
              <th style={cell}>Status</th>
              <th style={{ ...cell, textAlign: 'right' }}>Uses</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.bomLineId}
                onClick={() => onOpen(row.bomId)}
                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', opacity: row.bomStatus === 'retired' ? 0.6 : 1 }}
              >
                <td style={cell}>
                  {row.targetItemCode ?? row.targetItemId}
                  {row.targetItemName ? ` · ${row.targetItemName}` : ''}
                </td>
                <td style={cell}>
                  <code>v{row.bomVersion}</code> {row.bomName}
                </td>
                <td style={cell}>{row.bomStatus.replace('_', ' ')}</td>
                <td style={{ ...cell, textAlign: 'right' }}>
                  {formatQty(row.lineQuantity)} {row.lineUnit} per {formatQty(row.baseQuantity)} {row.baseUnit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
