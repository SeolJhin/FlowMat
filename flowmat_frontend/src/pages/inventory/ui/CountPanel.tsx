import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useInventoriesQuery } from '../../../entities/inventory/api/useInventoriesQuery'
import { useStockAnalysisQuery } from '../../../entities/inventory/api/useStockAnalysis'
import { useInventoryCountMutation, type InventoryCountResultDto, type InventoryCountInput } from '../../../entities/inventory/api/useInventoryCount'
import { useStorageLocationsQuery } from '../../../entities/inventory/api/useStorageLocations'
import { errorMessage, errorStatus } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import type { ItemDto } from '../../../shared/types/api'
import { ABC_COUNT_DAYS, COUNT_DUE_DAYS, buildCountLines, countDifference, countDue, countIntervalDays, filterCountRows, lastCountedLabel, snapshotCountEntries, type CountDraft } from '../model/countModel'
import { countSheetCsv, entriesFromSheet } from '../model/countSheetModel'
import { codesWithin } from '../model/locationModel'

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
  // A listed place: only records there or at a place inside it (docs/domain/storage-location.md).
  const [place, setPlace] = useState('')
  const [draft, setDraft] = useState<CountDraft>({ entries: {}, expectedQuantities: {} })
  const { entries, expectedQuantities } = draft
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [result, setResult] = useState<InventoryCountResultDto | null>(null)
  const [blindSheet, setBlindSheet] = useState(false)
  const [sheetMessage, setSheetMessage] = useState<string | null>(null)
  const [loadingSheet, setLoadingSheet] = useState(false)
  const sheetReadGeneration = useRef(0)

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
  const locations = useStorageLocationsQuery(projectId).data ?? []
  const within = place ? codesWithin(locations, place) : null
  const rows = filterCountRows(allRows, filter, itemLabel)
    .filter((row) => !dueOnly || isDue(row))
    .filter((row) => !within || within.has(row.location?.trim().toLowerCase() ?? ''))
  const failureStatus = errorStatus(countMutation.error)
  const unconfirmed = countMutation.isError && (failureStatus === null || failureStatus >= 500)
  const inputsLocked = countMutation.isPending || unconfirmed || loadingSheet
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
    const generation = ++sheetReadGeneration.current
    setLoadingSheet(true)
    setSheetMessage(null)
    try {
      const text = await file.text()
      if (generation !== sheetReadGeneration.current) return
      const read = entriesFromSheet(text, new Set(allRows.map((row) => row.inventoryId)))
      if (!read.ok) {
        setSheetMessage(read.error)
        return
      }
      setDraft((current) => snapshotCountEntries(current, read.entries, allRows))
      setSheetMessage(`Loaded ${read.filled} count${read.filled === 1 ? '' : 's'}${read.unknown ? `; ${read.unknown} record(s) not in the list skipped` : ''}. Check them, then apply.`)
    } catch {
      if (generation === sheetReadGeneration.current) {
        setSheetMessage('The counted sheet could not be read. Choose the file again.')
      }
    } finally {
      if (generation === sheetReadGeneration.current) setLoadingSheet(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (countMutation.isPending || loadingSheet) return
    let input: InventoryCountInput
    if (unconfirmed && countMutation.variables) {
      // Replay the submitted operation, including rows removed since then; do not build a new partial count.
      input = countMutation.variables
    } else {
      const built = buildCountLines(entries, inventoriesQuery.data ?? [], expectedQuantities)
      if (!built.ok) {
        setFormError(built.error)
        return
      }
      input = { note: note.trim() || undefined, lines: built.lines }
    }
    setFormError(null)
    setResult(null)
    try {
      setResult(await countMutation.mutateAsync(input))
      setDraft({ entries: {}, expectedQuantities: {} })
      setNote('')
    } catch {
      // A lost response can follow a committed count; keep the draft so the same request can be replayed.
    }
  }

  return (
    <form aria-busy={countMutation.isPending || loadingSheet} aria-label="Stock count" onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: 12 }}>
      <p className="inspector-hint" style={{ margin: 0 }}>
        Type what is physically there. Records left blank are not counted. Applying adjusts every counted record at once,
        or none if one of them cannot be (for example it moved while you were counting). The first quantity seen is kept until you clear the count.
      </p>
      {unconfirmed && (
        <p role="status" className="inspector-hint" style={{ margin: 0 }}>
          The count result is unconfirmed. Retry Apply count with the same values before clearing or leaving this page.
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
        <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
          <span>Filter</span>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="item, LOT or location" />
        </label>
        {locations.length > 0 && (
          <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
            <span>Place</span>
            <select aria-label="Place" value={place} onChange={(e) => setPlace(e.target.value)}>
              <option value="">All places</option>
              {locations.map((one) => <option key={one.locationId} value={one.locationId}>{one.path}</option>)}
            </select>
          </label>
        )}
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
          <input value={note} disabled={inputsLocked} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="e.g. monthly count, shelf A" />
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
              accept=".csv,text/csv" disabled={inputsLocked}
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
        <button type="button" disabled={countMutation.isPending || (typed === 0 && !loadingSheet)} onClick={() => {
          sheetReadGeneration.current += 1
          setLoadingSheet(false)
          setDraft({ entries: {}, expectedQuantities: {} })
          setFormError(null)
          setResult(null)
          setSheetMessage(null)
          countMutation.reset()
        }}>Clear counts</button>
        <button type="submit" disabled={countMutation.isPending || loadingSheet || typed === 0}>
          {countMutation.isPending ? 'Applying...' : `Apply count (${typed})`}
        </button>
      </div>

      {loadingSheet && <p role="status" style={{ fontSize: 12, margin: 0 }}>Reading counted sheet...</p>}
      {sheetMessage && (
        <p role="status" aria-label="Count sheet result" style={{ fontSize: 12, margin: 0 }}>
          {sheetMessage}
        </p>
      )}
      {(formError || countMutation.isError) && (
        <p role="alert" style={{ color: '#dc2626', fontSize: 12, margin: 0 }}>
          {formError ?? errorMessage(countMutation.error, 'The count could not be confirmed.')}
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
            const difference = countDifference(entries[row.inventoryId], expectedQuantities[row.inventoryId] ?? row.quantity)
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
                    value={entries[row.inventoryId] ?? ''} disabled={inputsLocked}
                    onChange={(e) => {
                      const text = e.target.value
                      setDraft((current) => snapshotCountEntries(current, { [row.inventoryId]: text }, [row]))
                    }}
                    style={{ width: 80, textAlign: 'right' }}
                  />
                  {expectedQuantities[row.inventoryId] !== undefined && expectedQuantities[row.inventoryId] !== row.quantity && (
                    <small style={{ display: 'block', color: '#b91c1c' }}>{unconfirmed ? 'Count result unconfirmed. Retry the same count.' : 'Stock changed. Clear this count and recount.'}</small>
                  )}
                </td>
                <td
                  style={{
                    ...num,
                    color: difference === null || difference === 0 ? undefined : difference < 0 ? '#b91c1c' : '#047857',
                  }}
                >
                  {difference === null ? '' : difference === 0 ? '0' : difference > 0 ? `+${formatQty(difference)}` : formatQty(difference)}
                  {expectedQuantities[row.inventoryId] !== undefined && expectedQuantities[row.inventoryId] !== row.quantity && (
                    <small style={{ display: 'block', color: '#b91c1c' }}>{unconfirmed ? 'Count result unconfirmed. Retry the same count.' : 'Stock changed. Clear this count and recount.'}</small>
                  )}
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
