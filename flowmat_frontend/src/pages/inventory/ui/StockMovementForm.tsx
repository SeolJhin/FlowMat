import { useState, type FormEvent } from 'react'
import { useStockMovementMutation } from '../../../entities/inventory/api/useStockMovements'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import type { InventoryDto } from '../../../shared/types/api'
import { MOVEMENT_LABELS, MOVEMENT_TYPES, type MovementType } from '../model/stockModel'

/**
 * Records one movement against a stock record through the command API: the server keeps the stock invariants
 * (nothing below zero, reservations within what is on hand) and writes the history row in the same transaction.
 */
export function StockMovementForm({ projectId, inventory }: { projectId: string; inventory: InventoryDto }) {
  const movement = useStockMovementMutation(projectId)
  const [type, setType] = useState<MovementType>('receipt')
  const [direction, setDirection] = useState<'increase' | 'decrease'>('increase')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await movement.mutateAsync({
        inventoryId: inventory.inventoryId,
        transactionType: type,
        quantity: Number(quantity),
        direction: type === 'adjustment' ? direction : undefined,
        note: note.trim() || undefined,
      })
      setQuantity('')
      setNote('')
    } catch {
      // Shown below (e.g. "Not enough available stock: 3 available, 5 needed.").
    }
  }

  const quarantined = inventory.inventoryStatus === 'quarantined'

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      aria-label="Record stock movement"
      style={{ display: 'grid', gridTemplateColumns: '180px 90px 1fr auto', gap: 6, alignItems: 'end', margin: '0 0 12px' }}
    >
      <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
        <span>Movement</span>
        <select value={type} onChange={(e) => setType(e.target.value as MovementType)}>
          {MOVEMENT_TYPES.map((value) => <option key={value} value={value}>{MOVEMENT_LABELS[value]}</option>)}
        </select>
      </label>
      <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
        <span>Quantity</span>
        <input type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
      </label>
      <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
        <span>Note</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. delivery 2026-09-24 / cycle count" />
      </label>
      <button type="submit" disabled={movement.isPending}>{movement.isPending ? 'Saving...' : 'Record'}</button>
      {type === 'adjustment' && (
        <div role="radiogroup" aria-label="Adjustment direction" style={{ gridColumn: '1 / -1', display: 'flex', gap: 12, fontSize: 12 }}>
          {(['increase', 'decrease'] as const).map((value) => (
            <label key={value} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input type="radio" name="adjustment-direction" checked={direction === value} onChange={() => setDirection(value)} />
              {value}
            </label>
          ))}
        </div>
      )}
      <span style={{ gridColumn: '1 / -1', fontSize: 11, opacity: 0.65 }}>
        {formatQty(inventory.availableQuantity)} available · {formatQty(inventory.reservedQuantity)} reserved
        {quarantined ? ' · quarantined: issue and reserve are refused until released' : ''}
      </span>
      {movement.isError && (
        <p style={{ gridColumn: '1 / -1', color: '#dc2626', fontSize: 12, margin: 0 }}>
          {errorMessage(movement.error, 'The movement was refused.')}
        </p>
      )}
    </form>
  )
}
