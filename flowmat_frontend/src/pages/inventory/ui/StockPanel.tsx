import { useMemo, useState, type FormEvent } from 'react'
import { useInventoriesQuery } from '../../../entities/inventory/api/useInventoriesQuery'
import { useCreateInventoryMutation } from '../../../entities/inventory/api/useCreateInventoryMutation'
import { useUpdateInventoryMutation } from '../../../entities/inventory/api/useUpdateInventoryMutation'
import { useDeleteInventoryMutation } from '../../../entities/inventory/api/useDeleteInventoryMutation'
import { useInventoryTransactionsQuery } from '../../../entities/inventory/api/useInventoryTransactionsQuery'
import { errorMessage, errorStatus } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import type { InventoryDto, ItemDto } from '../../../shared/types/api'

const INVENTORY_STATUSES = ['available', 'hold', 'quarantine']

const cell = { padding: '8px 6px' } as const
const num = { ...cell, textAlign: 'right' } as const

interface StockForm {
  itemId: string
  quantity: string
  reservedQuantity: string
  location: string
  inventoryStatus: string
  minThreshold: string
  maxThreshold: string
}

const EMPTY_FORM: StockForm = {
  itemId: '',
  quantity: '',
  reservedQuantity: '0',
  location: '',
  inventoryStatus: 'available',
  minThreshold: '',
  maxThreshold: '',
}

const LEVEL_BADGE: Record<string, { label: string; fg: string; bg: string } | undefined> = {
  low: { label: 'Low', fg: '#b91c1c', bg: '#fee2e2' },
  over: { label: 'Over', fg: '#92400e', bg: '#fef3c7' },
}

function signed(value: number): string {
  const n = Number(value)
  return n > 0 ? `+${formatQty(n)}` : formatQty(n)
}

export function StockPanel({ projectId, items }: { projectId: string; items: ItemDto[] }) {
  const inventoriesQuery = useInventoriesQuery(projectId)
  const createMutation = useCreateInventoryMutation(projectId)
  const updateMutation = useUpdateInventoryMutation(projectId)
  const deleteMutation = useDeleteInventoryMutation(projectId)

  const [editing, setEditing] = useState<InventoryDto | null>(null)
  const [historyFor, setHistoryFor] = useState<string | null>(null)
  const [form, setForm] = useState<StockForm>(EMPTY_FORM)
  const transactionsQuery = useInventoryTransactionsQuery(historyFor)

  const inventories = inventoriesQuery.data ?? []
  const itemLabel = useMemo(
    () => new Map(items.map((item) => [item.itemId, `${item.itemCode} · ${item.itemName}`])),
    [items],
  )
  const historyInventory = inventories.find((inv) => inv.inventoryId === historyFor)

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditing(null)
    createMutation.reset()
    updateMutation.reset()
  }

  function startEdit(inventory: InventoryDto) {
    setEditing(inventory)
    setForm({
      itemId: inventory.itemId,
      quantity: String(inventory.quantity),
      reservedQuantity: String(inventory.reservedQuantity ?? 0),
      location: inventory.location ?? '',
      inventoryStatus: inventory.inventoryStatus,
      minThreshold: inventory.minThreshold ? String(inventory.minThreshold) : '',
      maxThreshold: inventory.maxThreshold !== null ? String(inventory.maxThreshold) : '',
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const payload = {
      projectId,
      itemId: form.itemId,
      quantity: Number(form.quantity),
      reservedQuantity: Number(form.reservedQuantity) || 0,
      location: form.location.trim() || undefined,
      inventoryStatus: form.inventoryStatus,
      minThreshold: form.minThreshold === '' ? undefined : Number(form.minThreshold),
      maxThreshold: form.maxThreshold === '' ? undefined : Number(form.maxThreshold),
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          inventoryId: editing.inventoryId,
          ...payload,
          expectedVersion: editing.version ?? undefined,
        })
      } else {
        await createMutation.mutateAsync(payload)
      }
      resetForm()
    } catch {
      // Surfaced through the mutation error state below the form (includes rule-engine rejections).
    }
  }

  function handleDelete(inventoryId: string) {
    if (!window.confirm('Delete this stock record?')) return
    deleteMutation.mutate(inventoryId, {
      onSuccess: () => {
        if (editing?.inventoryId === inventoryId) resetForm()
        if (historyFor === inventoryId) setHistoryFor(null)
      },
    })
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const saveError = createMutation.error ?? updateMutation.error
  // A 409 means the record moved since the form opened; the list is refetched, so offer its current values.
  const conflict = errorStatus(updateMutation.error) === 409
  const latestEditing = editing ? inventories.find((inv) => inv.inventoryId === editing.inventoryId) : undefined
  const reserved = Number(form.reservedQuantity) || 0
  const available = form.quantity === '' ? null : Number(form.quantity) - reserved

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
      <section>
        {inventoriesQuery.isLoading && <p>Loading stock...</p>}
        {inventoriesQuery.isError && (
          <p style={{ color: '#dc2626' }}>{errorMessage(inventoriesQuery.error, 'Failed to load stock.')}</p>
        )}
        {!inventoriesQuery.isLoading && inventories.length === 0 && (
          <p className="inspector-hint">No stock records yet. Add one to track quantities and let runs consume it.</p>
        )}
        {inventories.some((inv) => inv.stockLevel === 'low') && (
          <p style={{ color: '#b91c1c', fontSize: 13, marginTop: 0 }}>
            {inventories.filter((inv) => inv.stockLevel === 'low').length} stock record(s) are below their minimum.
          </p>
        )}
        {inventories.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={cell}>Item</th>
                <th style={cell}>Location</th>
                <th style={{ ...num }}>On hand</th>
                <th style={{ ...num }}>Reserved</th>
                <th style={{ ...num }}>Available</th>
                <th style={cell}>Status</th>
                <th style={cell}></th>
              </tr>
            </thead>
            <tbody>
              {inventories.map((inv) => (
                <tr
                  key={inv.inventoryId}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background:
                      editing?.inventoryId === inv.inventoryId || historyFor === inv.inventoryId
                        ? 'var(--accent-bg)'
                        : undefined,
                  }}
                >
                  <td style={cell}>{itemLabel.get(inv.itemId) ?? inv.itemId}</td>
                  <td style={{ ...cell, opacity: 0.7 }}>{inv.location ?? '-'}</td>
                  <td style={num}>{formatQty(inv.quantity)}</td>
                  <td style={{ ...num, opacity: 0.7 }}>{formatQty(inv.reservedQuantity)}</td>
                  <td style={{ ...num, fontWeight: 600, color: Number(inv.availableQuantity) < 0 ? '#dc2626' : undefined }}>
                    {formatQty(inv.availableQuantity)}
                  </td>
                  <td style={cell}>
                    <span style={{ opacity: 0.7 }}>{inv.inventoryStatus}</span>
                    {LEVEL_BADGE[inv.stockLevel] && (
                      <span
                        title={
                          inv.stockLevel === 'low'
                            ? `Available is below the minimum of ${formatQty(inv.minThreshold)}`
                            : `On hand exceeds the maximum of ${formatQty(inv.maxThreshold)}`
                        }
                        style={{
                          marginLeft: 6,
                          padding: '1px 6px',
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 600,
                          color: LEVEL_BADGE[inv.stockLevel]!.fg,
                          background: LEVEL_BADGE[inv.stockLevel]!.bg,
                        }}
                      >
                        {LEVEL_BADGE[inv.stockLevel]!.label}
                      </span>
                    )}
                  </td>
                  <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                    <button type="button" onClick={() => startEdit(inv)} style={{ marginRight: 4, fontSize: 12 }}>
                      Adjust
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFor(historyFor === inv.inventoryId ? null : inv.inventoryId)}
                      style={{ marginRight: 4, fontSize: 12 }}
                    >
                      History
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(inv.inventoryId)}
                      disabled={deleteMutation.isPending}
                      style={{ fontSize: 12, color: '#dc2626', border: '1px solid #fca5a5', background: '#fef2f2' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {deleteMutation.isError && (
          <p style={{ color: '#dc2626', fontSize: 12 }}>
            {errorMessage(deleteMutation.error, 'Failed to delete stock record.')}
          </p>
        )}

        {historyFor && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 8 }}>
              History — {historyInventory ? itemLabel.get(historyInventory.itemId) ?? historyInventory.itemId : historyFor}
            </h3>
            {transactionsQuery.isLoading && <p>Loading history...</p>}
            {transactionsQuery.isError && (
              <p style={{ color: '#dc2626' }}>{errorMessage(transactionsQuery.error, 'Failed to load history.')}</p>
            )}
            {transactionsQuery.data && transactionsQuery.data.length === 0 && (
              <p className="inspector-hint">No movements recorded.</p>
            )}
            {transactionsQuery.data && transactionsQuery.data.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                    <th style={cell}>When</th>
                    <th style={cell}>Type</th>
                    <th style={num}>Δ On hand</th>
                    <th style={num}>On hand after</th>
                    <th style={num}>Available after</th>
                    <th style={cell}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionsQuery.data.map((tx) => (
                    <tr key={tx.inventoryTransactionId} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ ...cell, whiteSpace: 'nowrap', opacity: 0.7 }}>
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '-'}
                      </td>
                      <td style={cell}><code>{tx.transactionType}</code></td>
                      <td style={{ ...num, color: Number(tx.quantityDelta) < 0 ? '#b91c1c' : '#047857' }}>
                        {signed(tx.quantityDelta)}
                      </td>
                      <td style={num}>{formatQty(tx.quantityAfter)}</td>
                      <td style={num}>{formatQty(tx.availableAfter)}</td>
                      <td style={{ ...cell, opacity: 0.7 }}>{tx.note ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>

      <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
        <h3 style={{ marginTop: 0 }}>{editing ? 'Adjust Stock' : 'Add Stock'}</h3>
        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: 10 }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Item *</span>
            <select
              value={form.itemId}
              onChange={(e) => setForm((f) => ({ ...f, itemId: e.target.value }))}
              disabled={Boolean(editing)}
              required
            >
              <option value="" disabled>Select item</option>
              {items.map((item) => (
                <option key={item.itemId} value={item.itemId}>{item.itemCode} · {item.itemName}</option>
              ))}
            </select>
            {items.length === 0 && (
              <span style={{ fontSize: 11, opacity: 0.6 }}>Create an item on the Items tab first.</span>
            )}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>On hand *</span>
              <input
                type="number"
                step="any"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                required
              />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>Reserved</span>
              <input
                type="number"
                min="0"
                step="any"
                value={form.reservedQuantity}
                onChange={(e) => setForm((f) => ({ ...f, reservedQuantity: e.target.value }))}
              />
            </label>
          </div>
          {available !== null && (
            <span style={{ fontSize: 12, opacity: 0.7 }}>
              Available will be <strong>{formatQty(available)}</strong>
              {editing && ` (was ${formatQty(editing.availableQuantity)})`}
            </span>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>Min (reorder)</span>
              <input
                type="number"
                min="0"
                step="any"
                value={form.minThreshold}
                placeholder="0"
                onChange={(e) => setForm((f) => ({ ...f, minThreshold: e.target.value }))}
              />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>Max</span>
              <input
                type="number"
                min="0"
                step="any"
                value={form.maxThreshold}
                placeholder="none"
                onChange={(e) => setForm((f) => ({ ...f, maxThreshold: e.target.value }))}
              />
            </label>
          </div>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Location</span>
            <input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="e.g. WH-A / Rack 3"
            />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Status</span>
            <select value={form.inventoryStatus} onChange={(e) => setForm((f) => ({ ...f, inventoryStatus: e.target.value }))}>
              {INVENTORY_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              {!INVENTORY_STATUSES.includes(form.inventoryStatus) && (
                <option value={form.inventoryStatus}>{form.inventoryStatus}</option>
              )}
            </select>
          </label>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="submit" disabled={isPending || items.length === 0}>
              {isPending ? 'Saving...' : editing ? 'Save adjustment' : 'Add'}
            </button>
            {editing && (
              <button type="button" onClick={resetForm} style={{ background: 'transparent' }}>
                Cancel
              </button>
            )}
          </div>
          {editing && (
            <span style={{ fontSize: 11, opacity: 0.6 }}>
              Saving records an &quot;adjust&quot; entry in this record&apos;s history.
            </span>
          )}
          {saveError && (
            <p style={{ color: '#dc2626', fontSize: 12, margin: 0 }}>{errorMessage(saveError, 'Failed to save stock.')}</p>
          )}
          {conflict && latestEditing && (
            <button type="button" onClick={() => { updateMutation.reset(); startEdit(latestEditing) }}>
              Load latest values ({formatQty(latestEditing.quantity)} on hand)
            </button>
          )}
        </form>
      </section>
    </div>
  )
}
