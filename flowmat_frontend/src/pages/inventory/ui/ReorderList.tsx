import { useState, type FormEvent } from 'react'
import { useItemsQuery } from '../../../entities/catalog/api/useItemsQuery'
import { useStockAnalysisQuery } from '../../../entities/inventory/api/useStockAnalysis'
import {
  usePlaceSafetyStocksQuery,
  useReorderListQuery,
  useSetPlaceSafetyStockMutation,
} from '../../../entities/inventory/api/useStockAlerts'
import { useStorageLocationsQuery, type StorageLocationDto } from '../../../entities/inventory/api/useStorageLocations'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import type { ItemDto } from '../../../shared/types/api'
import { pickableItems } from '../model/itemStatusModel'
import { coverLabel } from '../model/stockAnalysisModel'
import {
  orderQuantity,
  orderValue,
  packsFor,
  placeSafetyPayload,
  reorderCsv,
  reorderFileName,
  reorderPlaces,
  reorderTitle,
  suggestedOrder,
  type ReorderRow,
} from '../model/stockAlertModel'

const cell = { padding: '4px 6px' } as const
const num = { ...cell, textAlign: 'right' } as const
/** The use rate the cover and the suggestion are worked out from. */
const USE_DAYS = 30

/**
 * Items whose usable stock over all their records is below their safety stock (docs/domain/stock-alert.md "재주문 목록"),
 * biggest shortfall first; safety stock is set on the item. With a location list it can be one place's list instead
 * (PS4-PS5): the items given a safety stock at that place, against the stock there and in the places inside it. How long
 * the stock lasts and how much to order come from the last 30 days of use (docs/domain/stock-analysis.md), for the place
 * when one is chosen; what the orders cost comes from the items' unit costs. The list downloads as a purchase list.
 * Without a location list it is hidden when nothing is short.
 */
export function ReorderList({ projectId }: { projectId: string }) {
  const places = reorderPlaces(useStorageLocationsQuery(projectId).data ?? [])
  const [place, setPlace] = useState('')
  const chosen = places.find((one) => one.locationCode === place) ?? null
  const reorderQuery = useReorderListQuery(projectId, chosen?.locationCode ?? null)
  const lines = reorderQuery.data ?? []
  const analysisQuery = useStockAnalysisQuery(projectId, USE_DAYS, lines.length > 0, chosen?.locationCode ?? null)
  const use = new Map((analysisQuery.data?.lines ?? []).map((line) => [line.itemId, line]))
  const items = useItemsQuery(projectId).data ?? []
  const itemById = new Map(items.map((item) => [item.itemId, item]))
  const rows: ReorderRow[] = lines.map((line) => {
    const dailyUse = use.get(line.itemId)?.averageDailyConsumption ?? null
    const item = itemById.get(line.itemId)
    return {
      line, dailyUse, suggested: suggestedOrder(line, dailyUse), unitCost: item?.unitCost ?? null,
      purchaseUnit: item?.purchaseUnit ?? null, purchaseUnitQty: item?.purchaseUnit ? (item.purchaseUnitQty ?? null) : null,
    }
  })
  const values = rows.map((row) => orderValue(orderQuantity(row), row.unitCost))
  const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
  const unpriced = values.filter((value) => value === null).length

  function download() {
    const url = URL.createObjectURL(new Blob([reorderCsv(rows)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = reorderFileName(chosen?.locationCode ?? null, new Date().toISOString().slice(0, 10))
    link.click()
    URL.revokeObjectURL(url)
  }

  // Without a location list there is nothing to pick, so the list shows only when something is short.
  if (places.length === 0) {
    if (reorderQuery.isError) {
      return <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(reorderQuery.error, 'Failed to load the reorder list.')}</p>
    }
    if (lines.length === 0) return null
  }

  return (
    <section aria-label="Below safety stock" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: 13 }}>
          {reorderQuery.isPending ? 'Checking safety stock...' : reorderTitle(lines.length, chosen?.locationCode ?? null)}
        </strong>
        {lines.length > 0 && (
          <span aria-label="Suggested orders value" className="inspector-hint">
            suggested orders ≈ {formatQty(total)}
            {unpriced > 0 ? ` (${unpriced} without a unit cost)` : ''}
          </span>
        )}
        {places.length > 0 && (
          <label style={{ fontSize: 12 }}>
            Reorder at{' '}
            <select aria-label="Reorder at" value={chosen?.locationCode ?? ''} onChange={(event) => setPlace(event.target.value)}>
              <option value="">all places (item safety stock)</option>
              {places.map((one) => <option key={one.locationId} value={one.locationCode}>{one.path}</option>)}
            </select>
          </label>
        )}
        {lines.length > 0 && (
          <button type="button" style={{ fontSize: 11, marginLeft: 'auto' }} onClick={download}>
            Download CSV
          </button>
        )}
      </div>
      {reorderQuery.isError && (
        <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(reorderQuery.error, 'Failed to load the reorder list.')}</p>
      )}
      {lines.length > 0 && (
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
              <th style={num} title="What is ordered (whole purchase units when the item has one) at the item's unit cost">
                Order value
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
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
                    {formatQty(rows[index].suggested)} {line.unit ?? ''}
                    {rows[index].purchaseUnit && (
                      <div className="inspector-hint" style={{ fontWeight: 400 }}>
                        → {packsFor(rows[index].suggested, rows[index].purchaseUnitQty)} {rows[index].purchaseUnit} ({formatQty(orderQuantity(rows[index]))}{' '}
                        {line.unit ?? ''})
                      </div>
                    )}
                  </td>
                  <td style={num}>{formatQty(values[index])}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {chosen && <PlaceSafetyStocks key={chosen.locationId} projectId={projectId} place={chosen} items={items} />}
    </section>
  )
}

/** The items a place watches, with their safety stock there (PS1-PS3): set, change or remove one. */
function PlaceSafetyStocks({ projectId, place, items }: { projectId: string; place: StorageLocationDto; items: ItemDto[] }) {
  const listQuery = usePlaceSafetyStocksQuery(projectId)
  const set = useSetPlaceSafetyStockMutation(projectId)
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const here = (listQuery.data ?? []).filter((row) => row.locationId === place.locationId)
  const failure = problem ?? (set.isError ? errorMessage(set.error) : listQuery.isError ? errorMessage(listQuery.error) : null)

  function save(event: FormEvent) {
    event.preventDefault()
    const payload = placeSafetyPayload(itemId, quantity)
    setProblem(payload.error)
    if (!payload.input) return
    set.mutate({ locationId: place.locationId, ...payload.input }, {
      onSuccess: () => {
        setItemId('')
        setQuantity('')
      },
    })
  }

  return (
    <div role="group" aria-label={`Safety stock at ${place.locationCode}`} style={{ marginTop: 8, fontSize: 12 }}>
      <div className="inspector-hint">
        {place.locationCode} watches only the items given a safety stock here; stock in the places inside it counts.
      </div>
      {here.length > 0 && (
        <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
          {here.map((row) => (
            <li key={row.placeSafetyStockId}>
              {row.itemCode} · {row.itemName}: {formatQty(row.safetyStockQty)} {row.unit ?? ''}
              <button type="button" style={{ marginLeft: 6, fontSize: 11 }} disabled={set.isPending}
                onClick={() => set.mutate({ itemId: row.itemId, locationId: place.locationId, safetyStockQty: null })}>Remove</button>
            </li>
          ))}
        </ul>
      )}
      <form aria-label={`Set safety stock at ${place.locationCode}`} onSubmit={save}
        style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
        <select aria-label="Item to watch" value={itemId} onChange={(event) => setItemId(event.target.value)}>
          <option value="">Item...</option>
          {pickableItems(items).map((item) => <option key={item.itemId} value={item.itemId}>{item.itemCode} · {item.itemName}</option>)}
        </select>
        <input aria-label="Safety stock here" type="number" min="0" step="any" value={quantity} style={{ width: 90 }}
          onChange={(event) => setQuantity(event.target.value)} />
        <button type="submit" disabled={set.isPending}>Save</button>
      </form>
      {failure && <p role="alert" style={{ color: '#dc2626', margin: '4px 0 0' }}>{failure}</p>}
    </div>
  )
}
