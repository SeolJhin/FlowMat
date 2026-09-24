import { useMemo, useState, type FormEvent } from 'react'
import { useCloseLotMutation, useCreateLotMutation, useLotTraceQuery, useLotsQuery } from '../../../entities/inventory/api/useLots'
import type { ItemDto, LotDto, LotStatus } from '../../../shared/types/api'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'

const STATUS_COLORS: Record<LotStatus, string> = {
  available: '#15803d',
  reserved: '#1d4ed8',
  quarantined: '#b91c1c',
  consumed: '#9ca3af',
  closed: '#6b7280',
}

const cell = { padding: '6px 6px' } as const

export function LotPanel({ projectId, items }: { projectId: string; items: ItemDto[] }) {
  const lotsQuery = useLotsQuery(projectId)
  const lots = lotsQuery.data ?? []
  const itemLabel = useMemo(() => new Map(items.map((item) => [item.itemId, `${item.itemCode} · ${item.itemName}`])), [items])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = lots.find((lot) => lot.lotId === selectedId) ?? null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
      <section>
        {lotsQuery.isLoading && <p>Loading LOTs...</p>}
        {lotsQuery.isError && <p style={{ color: '#dc2626' }}>{errorMessage(lotsQuery.error, 'Failed to load LOTs.')}</p>}
        {!lotsQuery.isLoading && lots.length === 0 && (
          <p className="inspector-hint">
            No LOTs yet. Turn on “Track stock per LOT” for an item, then register LOTs here.
          </p>
        )}
        {lots.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={cell}>LOT</th>
                <th style={cell}>Item</th>
                <th style={{ ...cell, textAlign: 'right' }}>On hand</th>
                <th style={{ ...cell, textAlign: 'right' }}>Reserved</th>
                <th style={cell}>Expiry</th>
                <th style={cell}>Status</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => (
                <tr
                  key={lot.lotId}
                  onClick={() => setSelectedId(lot.lotId)}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: lot.lotId === selectedId ? 'var(--accent-bg)' : undefined,
                  }}
                >
                  <td style={cell}><code>{lot.lotNo}</code></td>
                  <td style={cell}>{itemLabel.get(lot.itemId) ?? lot.itemId}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>{formatQty(lot.quantityOnHand)}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>{formatQty(lot.quantityReserved)}</td>
                  <td style={cell}>{lot.expiryDate ?? '-'}</td>
                  <td style={{ ...cell, color: STATUS_COLORS[lot.lotStatus], fontWeight: 600 }}>{lot.lotStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
        {selected ? (
          <LotDetail key={selected.lotId} projectId={projectId} lot={selected} itemLabel={itemLabel} onClose={() => setSelectedId(null)} />
        ) : (
          <CreateLotForm projectId={projectId} items={items.filter((item) => item.lotManageYn === 'Y')} onCreated={setSelectedId} />
        )}
      </section>
    </div>
  )
}

function CreateLotForm({ projectId, items, onCreated }: { projectId: string; items: ItemDto[]; onCreated: (lotId: string) => void }) {
  const createMutation = useCreateLotMutation(projectId)
  const [form, setForm] = useState({ itemId: '', lotNo: '', expiryDate: '' })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      const lot = await createMutation.mutateAsync({
        itemId: form.itemId,
        lotNo: form.lotNo.trim(),
        expiryDate: form.expiryDate || undefined,
      })
      setForm({ itemId: form.itemId, lotNo: '', expiryDate: '' })
      onCreated(lot.lotId)
    } catch {
      // Shown below.
    }
  }

  return (
    <>
      <h3 style={{ marginTop: 0 }}>Register LOT</h3>
      {items.length === 0 ? (
        <p className="inspector-hint">No item tracks LOTs yet. Edit an item and tick “Track stock per LOT”.</p>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Item *</span>
            <select value={form.itemId} onChange={(e) => setForm((f) => ({ ...f, itemId: e.target.value }))} required>
              <option value="" disabled>Select item</option>
              {items.map((item) => <option key={item.itemId} value={item.itemId}>{item.itemCode} · {item.itemName}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>LOT number *</span>
            <input value={form.lotNo} onChange={(e) => setForm((f) => ({ ...f, lotNo: e.target.value }))} placeholder="e.g. 2026-09-A01" required />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Expiry date</span>
            <input type="date" value={form.expiryDate} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} />
          </label>
          <span style={{ fontSize: 11, opacity: 0.6 }}>
            LOT numbers are unique within the project. Receive stock into the LOT from the Stock tab.
          </span>
          <button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Saving...' : 'Register'}</button>
          {createMutation.isError && (
            <p style={{ color: '#dc2626', fontSize: 12, margin: 0 }}>{errorMessage(createMutation.error, 'Failed to register LOT.')}</p>
          )}
        </form>
      )}
    </>
  )
}

function LotDetail({
  projectId,
  lot,
  itemLabel,
  onClose,
}: {
  projectId: string
  lot: LotDto
  itemLabel: Map<string, string>
  onClose: () => void
}) {
  const [direction, setDirection] = useState<'backward' | 'forward'>('backward')
  const traceQuery = useLotTraceQuery(lot.lotId, direction)
  const closeMutation = useCloseLotMutation(projectId)

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3 style={{ marginTop: 0 }}><code>{lot.lotNo}</code></h3>
        <button type="button" onClick={onClose} style={{ background: 'transparent', fontSize: 12 }}>Register LOT</button>
      </div>
      <p style={{ margin: '0 0 6px', fontSize: 13 }}>
        {itemLabel.get(lot.itemId) ?? lot.itemId} ·{' '}
        <strong style={{ color: STATUS_COLORS[lot.lotStatus] }}>{lot.lotStatus}</strong>
      </p>
      <p style={{ margin: '0 0 12px', fontSize: 12, opacity: 0.75 }}>
        {formatQty(lot.quantityOnHand)} on hand, {formatQty(lot.quantityReserved)} reserved
        {lot.productionRunId ? ' · produced by a run' : ''}
        {lot.lotStatus === 'quarantined' ? ' · release it from the Stock tab' : ''}
      </p>

      {lot.lotStatus !== 'closed' && (
        <button
          type="button"
          disabled={closeMutation.isPending || lot.quantityOnHand !== 0}
          title={lot.quantityOnHand !== 0 ? 'Only an empty LOT can be closed.' : undefined}
          onClick={() => {
            if (window.confirm(`Close LOT ${lot.lotNo}? It can no longer take any stock movement.`)) closeMutation.mutate(lot.lotId)
          }}
          style={{ marginBottom: 12 }}
        >
          Close LOT
        </button>
      )}
      {closeMutation.isError && (
        <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(closeMutation.error, 'Failed to close LOT.')}</p>
      )}

      <div role="tablist" style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {(['backward', 'forward'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={direction === value}
            onClick={() => setDirection(value)}
            style={{ fontWeight: direction === value ? 600 : 400, opacity: direction === value ? 1 : 0.65 }}
          >
            {value === 'backward' ? 'Made from' : 'Used in'}
          </button>
        ))}
      </div>
      {traceQuery.isLoading && <p style={{ fontSize: 12 }}>Tracing...</p>}
      {traceQuery.isError && <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(traceQuery.error, 'Trace failed.')}</p>}
      {traceQuery.data && traceQuery.data.nodes.length === 0 && (
        <p className="inspector-hint" style={{ fontSize: 12 }}>
          {direction === 'backward' ? 'No material LOTs recorded for this LOT.' : 'This LOT has not gone into any other LOT.'}
        </p>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13 }}>
        {traceQuery.data?.nodes.map((node) => (
          <li key={`${node.lot.lotId}-${node.viaLotId}`} style={{ padding: '4px 0', paddingLeft: (node.depth - 1) * 16 }}>
            <span style={{ opacity: 0.5 }}>{direction === 'backward' ? '↳ ' : '→ '}</span>
            <code>{node.lot.lotNo}</code> {itemLabel.get(node.lot.itemId) ?? node.lot.itemId}
            <span style={{ color: STATUS_COLORS[node.lot.lotStatus], marginLeft: 6, fontSize: 12 }}>{node.lot.lotStatus}</span>
            {node.consumedQty !== null && (
              <span style={{ opacity: 0.6, fontSize: 12 }}> · used {formatQty(node.consumedQty)} {node.unit ?? ''}</span>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
