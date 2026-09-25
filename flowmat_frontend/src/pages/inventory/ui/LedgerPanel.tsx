import { useEffect, useMemo, useState } from 'react'
import { useInventoriesQuery } from '../../../entities/inventory/api/useInventoriesQuery'
import { fetchLedgerPage, useLedgerSearchQuery } from '../../../entities/inventory/api/useLedgerSearch'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import type { InventoryTransactionDto, ItemDto } from '../../../shared/types/api'
import { EMPTY_LEDGER_FILTER, LEDGER_TYPES, ledgerCsv, toSearchParams, type LedgerFilter } from '../model/ledgerModel'

const cell = { padding: '6px 6px' } as const
const num = { ...cell, textAlign: 'right' } as const
const CSV_PAGE = 500
const CSV_MAX_ROWS = 25_000

/**
 * Every stock movement of the project, filtered and paged on the server (docs/domain/stock-ledger.md): narrowed by type,
 * item, dates and text, and downloadable as CSV exactly as filtered.
 */
export function LedgerPanel({ projectId, items }: { projectId: string; items: ItemDto[] }) {
  const inventoriesQuery = useInventoriesQuery(projectId)
  const [filter, setFilter] = useState<LedgerFilter>(EMPTY_LEDGER_FILTER)
  const [textInput, setTextInput] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportNote, setExportNote] = useState<string | null>(null)

  // Search once typing pauses instead of on every key.
  useEffect(() => {
    const timer = setTimeout(() => setFilter((current) => (current.text === textInput ? current : { ...current, text: textInput })), 300)
    return () => clearTimeout(timer)
  }, [textInput])

  const params = useMemo(() => toSearchParams(filter), [filter])
  const ledgerQuery = useLedgerSearchQuery(projectId, params)
  const rows = ledgerQuery.data?.pages.flatMap((page) => page.items) ?? []

  const itemLabel = useMemo(() => {
    const labels = new Map(items.map((item) => [item.itemId, `${item.itemCode} · ${item.itemName}`]))
    return (itemId: string) => labels.get(itemId) ?? itemId
  }, [items])
  const place = useMemo(() => {
    const places = new Map(
      (inventoriesQuery.data ?? []).map((row) => [row.inventoryId, `${row.location ?? '-'}${row.lotNo ? ` · LOT ${row.lotNo}` : ''}`]),
    )
    return (inventoryId: string) => places.get(inventoryId) ?? ''
  }, [inventoriesQuery.data])

  function update(patch: Partial<LedgerFilter>) {
    setFilter((current) => ({ ...current, ...patch }))
  }

  async function download() {
    setExporting(true)
    setExportNote(null)
    try {
      const all: InventoryTransactionDto[] = []
      let cursor: string | null = null
      do {
        const page = await fetchLedgerPage(projectId, params, cursor, CSV_PAGE)
        all.push(...page.items)
        cursor = page.nextCursor
      } while (cursor && all.length < CSV_MAX_ROWS)
      if (cursor) setExportNote(`Only the newest ${all.length} movements were exported; narrow the filter for the rest.`)
      const blob = new Blob([ledgerCsv(all, itemLabel, place)], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `stock-movements-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setExportNote(errorMessage(error, 'The export failed.'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <section aria-label="Stock movements" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap', fontSize: 12 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Type</span>
          <select value={filter.type} onChange={(e) => update({ type: e.target.value })}>
            <option value="">All types</option>
            {LEDGER_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Item</span>
          <select value={filter.itemId} onChange={(e) => update({ itemId: e.target.value })}>
            <option value="">All items</option>
            {items.map((item) => <option key={item.itemId} value={item.itemId}>{item.itemCode} · {item.itemName}</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>From</span>
          <input type="date" value={filter.from} onChange={(e) => update({ from: e.target.value })} />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>To</span>
          <input type="date" value={filter.to} onChange={(e) => update({ to: e.target.value })} />
        </label>
        <label style={{ display: 'grid', gap: 4, flex: 1, minWidth: 160 }}>
          <span>Search</span>
          <input value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="note, reference or who" />
        </label>
        <button
          type="button"
          onClick={() => {
            setTextInput('')
            setFilter(EMPTY_LEDGER_FILTER)
          }}
        >
          Clear
        </button>
        <button type="button" disabled={rows.length === 0 || exporting} onClick={() => void download()}>
          {exporting ? 'Preparing CSV...' : 'Download CSV'}
        </button>
      </div>
      {exportNote && <p role="status" style={{ margin: 0, fontSize: 12 }}>{exportNote}</p>}

      {ledgerQuery.isLoading && <p>Loading movements...</p>}
      {ledgerQuery.isError && <p style={{ color: '#dc2626' }}>{errorMessage(ledgerQuery.error, 'Failed to load movements.')}</p>}
      {!ledgerQuery.isLoading && rows.length === 0 && <p className="inspector-hint">No movements match.</p>}
      {rows.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
              <th style={cell}>Time</th>
              <th style={cell}>Type</th>
              <th style={cell}>Item</th>
              <th style={cell}>Place</th>
              <th style={num}>Change</th>
              <th style={num}>After</th>
              <th style={cell}>Reference</th>
              <th style={cell}>Note</th>
              <th style={cell}>By</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.inventoryTransactionId} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={cell}>{row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'}</td>
                <td style={cell}>{row.transactionType}</td>
                <td style={cell}>{itemLabel(row.itemId)}</td>
                <td style={cell}>{place(row.inventoryId) || '-'}</td>
                <td style={{ ...num, color: row.quantityDelta < 0 ? '#b91c1c' : row.quantityDelta > 0 ? '#047857' : undefined }}>
                  {row.quantityDelta > 0 ? '+' : ''}
                  {formatQty(row.quantityDelta)}
                  {row.reservedDelta !== 0 ? ` (res. ${row.reservedDelta > 0 ? '+' : ''}${formatQty(row.reservedDelta)})` : ''}
                </td>
                <td style={num}>{formatQty(row.quantityAfter)}</td>
                <td style={cell}>{row.referenceType ?? '-'}</td>
                <td style={cell}>{row.note ?? ''}</td>
                <td style={cell}>{row.createdBy ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {ledgerQuery.hasNextPage && (
        <button type="button" disabled={ledgerQuery.isFetchingNextPage} onClick={() => void ledgerQuery.fetchNextPage()}>
          {ledgerQuery.isFetchingNextPage ? 'Loading...' : 'Show more'}
        </button>
      )}
    </section>
  )
}
