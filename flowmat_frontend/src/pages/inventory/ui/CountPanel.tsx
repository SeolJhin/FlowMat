import { useMemo, useState, type FormEvent } from 'react'
import { useInventoriesQuery } from '../../../entities/inventory/api/useInventoriesQuery'
import { useStockAnalysisQuery } from '../../../entities/inventory/api/useStockAnalysis'
import { useInventoryCountMutation, type InventoryCountResultDto } from '../../../entities/inventory/api/useInventoryCount'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import type { ItemDto } from '../../../shared/types/api'
import { ABC_COUNT_DAYS, COUNT_DUE_DAYS, buildCountLines, countDifference, countDue, countIntervalDays, filterCountRows, lastCountedLabel } from '../model/countModel'
import { countSheetCsv, entriesFromSheet } from '../model/countSheetModel'

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
  const [dueOnly, setDueOnly] = useState(false)
  const [entries, setEntries] = useState<Record<string, string>>({})
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [result, setResult] = useState<InventoryCountResultDto | null>(null)
  const [blindSheet, setBlindSheet] = useState(false)
  const [sheetMessage, setSheetMessage] = useState<string | null>(null)

  const itemLabel = useMemo(() => {
    const labels = new Map(items.map((item) => [item.itemId, `${item.itemCode} · ${item.itemName}`]))
    return (itemId: string) => labels.get(itemId) ?? itemId
  }, [items])
  const allRows = inventoriesQuery.data ?? []
  // ABC classes over the last 90 days of use set how often each record is counted.
  const analysisQuery = useStockAnalysisQuery(projectId, 90)
  const abcByItem = useMemo(
    () => new Map((analysisQuery.data?.lines ?? []).map((line) => [line.itemId, line.abcClass])),
    [analysisQuery.data],
  )
  const intervalOf = (itemId: string) => countIntervalDays(abcByItem.get(itemId))
  const isDue = (row: (typeof allRows)[number]) => countDue(row, new Date(), intervalOf(row.itemId))
  const due = allRows.filter(isDue).length
  const rows = filterCountRows(allRows, filter, itemLabel).filter((row) => !dueOnly || isDue(row))
  const typed = Object.values(entries).filter((value) => value.trim() !== '').length

  function downloadSheet() {
    const url = URL.createObjectURL(new Blob([countSheetCsv(rows, itemLabel, blindSheet)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `count-sheet-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function loadSheet(file: File) {
    const read = entriesFromSheet(await file.text(), new Set(allRows.map((row) => row.inventoryId)))
    if (!read.ok) {
      setSheetMessage(read.error)
      return
    }
    setEntries((current) => ({ ...current, ...read.entries }))
    setSheetMessage(`Loaded ${read.filled} count${read.filled === 1 ? '' : 's'}${read.unknown ? `; ${read.unknown} record(s) not in the list skipped` : ''}. Check them, then apply.`)
  }

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
        <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 12, paddingBottom: 4 }}>
          <input type="checkbox" checked={dueOnly} onChange={(e) => setDueOnly(e.target.checked)} />
          <span
            title={`Counted again after ${ABC_COUNT_DAYS.A} days for A items, ${ABC_COUNT_DAYS.B} for B, ${ABC_COUNT_DAYS.C} for C and ${COUNT_DUE_DAYS} for items without an ABC class (last 90 days of use)`}
          >
            Due for a count ({due})
          </span>
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: 12, flex: 1, minWidth: 200 }}>
          <span>Note</span>
          <input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="e.g. monthly count, shelf A" />
        </label>
        <span role="group" aria-label="Count sheet" style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, paddingBottom: 4 }}>
          <button type="button" style={{ fontSize: 11 }} disabled={rows.length === 0} onClick={downloadSheet}>
            Download count sheet
          </button>
          <label style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            <input type="checkbox" checked={blindSheet} onChange={(e) => setBlindSheet(e.target.checked)} />
            blind
          </label>
          <label style={{ fontSize: 11 }}>
            Load counted sheet{' '}
            <input
              type="file"
              accept=".csv,text/csv"
              aria-label="Load counted sheet"
              style={{ fontSize: 11, width: 180 }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void loadSheet(file)
                e.target.value = ''
              }}
            />
          </label>
        </span>
        <button type="submit" disabled={countMutation.isPending || typed === 0}>
          {countMutation.isPending ? 'Applying...' : `Apply count (${typed})`}
        </button>
      </div>

      {sheetMessage && (
        <p role="status" aria-label="Count sheet result" style={{ fontSize: 12, margin: 0 }}>
          {sheetMessage}
        </p>
      )}
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
            <th style={cell}>Last counted</th>
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
                <td
                  style={{ ...cell, whiteSpace: 'nowrap', opacity: row.lastCheckedAt ? 0.75 : 0.5 }}
                  title={`${row.lastCheckedBy ? `by ${row.lastCheckedBy}; ` : ''}counted every ${intervalOf(row.itemId)} days${
                    abcByItem.get(row.itemId) ? ` (class ${abcByItem.get(row.itemId)})` : ''
                  }`}
                >
                  {lastCountedLabel(row.lastCheckedAt)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </form>
  )
}
