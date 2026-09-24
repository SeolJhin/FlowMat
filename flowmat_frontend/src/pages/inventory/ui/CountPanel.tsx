import { useMemo, useState, type FormEvent } from 'react'
import { useInventoriesQuery } from '../../../entities/inventory/api/useInventoriesQuery'
import { useInventoryCountMutation, type InventoryCountResultDto } from '../../../entities/inventory/api/useInventoryCount'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import type { ItemDto } from '../../../shared/types/api'
import { buildCountLines, countDifference, filterCountRows } from '../model/countModel'

const cell = { padding: '6px 6px' } as const
const num = { ...cell, textAlign: 'right' } as const

/**
 * Stock count (docs/domain/stock-count.md): type what is physically there for the records counted, then apply them all
 * at once. Blank records are left alone. If a record moved while counting, the whole count is refused and nothing
 * changes, so it can be counted again.
 */
export function CountPanel({ projectId, items }: { projectId: string; items: ItemDto[] }) {
  const inventoriesQuery = useInventoriesQuery(projectId)
  const countMutation = useInventoryCountMutation(projectId)
  const [filter, setFilter] = useState('')
  const [entries, setEntries] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [result, setResult] = useState<InventoryCountResultDto | null>(null)

  const itemLabel = useMemo(() => {
    const labels = new Map(items.map((item) => [item.itemId, `${item.itemCode} · ${item.itemName}`]))
    return (itemId: string) => labels.get(itemId) ?? itemId
  }, [items])
  const rows = filterCountRows(inventoriesQuery.data ?? [], filter, itemLabel)
  const typed = Object.values(entries).filter((value) => value.trim() !== '').length

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const built = buildCountLines(entries, inventoriesQuery.data ?? [])
    if (!built.ok) {
      setFormError(built.error)
      return
    }
    setFormError(null)
    setResult(null)
    try {
      setResult(await countMutation.mutateAsync({ note: note.trim() || undefined, lines: built.lines }))
      setEntries({})
      setNote('')
    } catch {
      // Shown below; nothing was changed.
    }
  }

  return (
    <form aria-label="Stock count" onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: 12 }}>
      <p className="inspector-hint" style={{ margin: 0 }}>
        Type what is physically there. Records left blank are not counted. Applying adjusts every counted record at once,
        or none if one of them cannot be (for example it moved while you were counting).
      </p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
        <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
          <span>Filter</span>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="item, LOT or location" />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: 12, flex: 1, minWidth: 200 }}>
          <span>Note</span>
          <input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="e.g. monthly count, shelf A" />
        </label>
        <button type="submit" disabled={countMutation.isPending || typed === 0}>
          {countMutation.isPending ? 'Applying...' : `Apply count (${typed})`}
        </button>
      </div>

      {(formError || countMutation.isError) && (
        <p role="alert" style={{ color: '#dc2626', fontSize: 12, margin: 0 }}>
          {formError ?? errorMessage(countMutation.error, 'The count was refused; nothing changed.')}
        </p>
      )}
      {result && (
        <p role="status" style={{ color: '#047857', fontSize: 12, margin: 0 }}>
          Count applied: {result.adjusted} record{result.adjusted === 1 ? '' : 's'} adjusted, {result.unchanged} already right.
        </p>
      )}

      {inventoriesQuery.isLoading && <p>Loading stock...</p>}
      {inventoriesQuery.isError && <p style={{ color: '#dc2626' }}>{errorMessage(inventoriesQuery.error, 'Failed to load stock.')}</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
            <th style={cell}>Item</th>
            <th style={cell}>LOT</th>
            <th style={cell}>Location</th>
            <th style={num}>On hand</th>
            <th style={num}>Reserved</th>
            <th style={num}>Counted</th>
            <th style={num}>Difference</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const difference = countDifference(entries[row.inventoryId], row.quantity)
            return (
              <tr key={row.inventoryId} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={cell}>{itemLabel(row.itemId)}</td>
                <td style={cell}>{row.lotNo ?? '-'}</td>
                <td style={cell}>{row.location ?? '-'}</td>
                <td style={num}>{formatQty(row.quantity)}</td>
                <td style={num}>{formatQty(row.reservedQuantity)}</td>
                <td style={num}>
                  <input
                    aria-label={`Counted ${itemLabel(row.itemId)} at ${row.location ?? 'no location'}${row.lotNo ? ` LOT ${row.lotNo}` : ''}`}
                    inputMode="decimal"
                    value={entries[row.inventoryId] ?? ''}
                    onChange={(e) => setEntries((current) => ({ ...current, [row.inventoryId]: e.target.value }))}
                    style={{ width: 80, textAlign: 'right' }}
                  />
                </td>
                <td
                  style={{
                    ...num,
                    color: difference === null || difference === 0 ? undefined : difference < 0 ? '#b91c1c' : '#047857',
                  }}
                >
                  {difference === null ? '' : difference === 0 ? '0' : difference > 0 ? `+${formatQty(difference)}` : formatQty(difference)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </form>
  )
}
