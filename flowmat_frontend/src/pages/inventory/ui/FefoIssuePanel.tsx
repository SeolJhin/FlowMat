import { useState, type FormEvent } from 'react'
import { useFefoIssueMutation } from '../../../entities/inventory/api/useFefoIssueMutation'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import type { FefoIssueDto, ItemDto } from '../../../shared/types/api'

/**
 * Issues or reserves a quantity of a LOT-tracked item from the LOTs that expire first, over as many stock records as it
 * takes (docs/domain/lot-expiry.md "재고 출고 나눠 하기"). Hidden when no item tracks LOTs.
 */
export function FefoIssuePanel({ projectId, items }: { projectId: string; items: ItemDto[] }) {
  const issue = useFefoIssueMutation(projectId)
  const [action, setAction] = useState<'issue' | 'reserve'>('issue')
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [result, setResult] = useState<FefoIssueDto | null>(null)
  const tracked = items.filter((item) => item.lotManageYn === 'Y')
  if (tracked.length === 0) return null

  function submit(event: FormEvent) {
    event.preventDefault()
    setResult(null)
    issue.mutate(
      { itemId, quantity: Number(quantity), note: note.trim() || undefined, action },
      {
        onSuccess: (done) => {
          setResult(done)
          setQuantity('')
          setNote('')
        },
      },
    )
  }

  const reserving = action === 'reserve'
  return (
    <details aria-label="Issue by item" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '8px 12px', marginBottom: 16, fontSize: 13 }}>
      <summary style={{ cursor: 'pointer' }}>Issue or reserve by item, first-expiring LOT first</summary>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap', marginTop: 8, fontSize: 12 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Action</span>
          <select value={action} onChange={(e) => setAction(e.target.value === 'reserve' ? 'reserve' : 'issue')}>
            <option value="issue">Issue</option>
            <option value="reserve">Reserve</option>
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Item</span>
          <select value={itemId} onChange={(e) => setItemId(e.target.value)} required>
            <option value="" disabled>Select item</option>
            {tracked.map((item) => <option key={item.itemId} value={item.itemId}>{item.itemCode} · {item.itemName}</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Quantity</span>
          <input type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} required style={{ width: 90 }} />
        </label>
        <label style={{ display: 'grid', gap: 4, flex: 1, minWidth: 160 }}>
          <span>Note</span>
          <input value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="e.g. order 42" />
        </label>
        <button type="submit" disabled={issue.isPending || !itemId || !(Number(quantity) > 0)}>
          {issue.isPending ? (reserving ? 'Reserving...' : 'Issuing...') : reserving ? 'Reserve' : 'Issue'}
        </button>
      </form>
      <p className="inspector-hint" style={{ margin: '6px 0 0' }}>
        In the item&apos;s own unit, from stock that is not already reserved. Expired, closed and quarantined stock is left
        alone; if the rest is not enough, nothing moves.
        {reserving && ' Reserved stock stays on hand; reverse a line in the ledger to let it go.'}
      </p>
      {result && (
        <p role="status" style={{ color: '#047857', fontSize: 12, margin: '6px 0 0' }}>
          {result.action === 'reserve' ? 'Reserved' : 'Issued'} {formatQty(result.quantity)} {result.unit ?? ''}:{' '}
          {result.lines
            .map((line) =>
              result.action === 'reserve'
                ? `LOT ${line.lotNo ?? line.lotId} ${formatQty(line.quantity)} (${line.location ?? 'no location'}, ${formatQty(line.reservedAfter)} of ${formatQty(line.quantityAfter)} reserved)`
                : `LOT ${line.lotNo ?? line.lotId} ${formatQty(line.quantity)} (${line.location ?? 'no location'}, ${formatQty(line.quantityAfter)} left)`,
            )
            .join('; ')}
        </p>
      )}
      {issue.isError && (
        <p style={{ color: '#dc2626', fontSize: 12, margin: '6px 0 0' }}>
          {errorMessage(issue.error, reserving ? 'The reservation was refused.' : 'The issue was refused.')}
        </p>
      )}
    </details>
  )
}
