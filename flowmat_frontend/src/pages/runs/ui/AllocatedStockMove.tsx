import { useEffect, useState } from 'react'
import { useAllocatedStockTransfer, type AllocatedStockTransferInput } from '../../../entities/inventory/api/useAllocatedStockTransfer'
import { useCurrentUserQuery } from '../../../entities/auth/api/useCurrentUserQuery'
import { useProjectMembersQuery } from '../../../entities/project/api/useProjectMembersQuery'
import type { StockAllocationDto } from '../../../entities/production/api/useStockAllocations'
import { errorMessage, errorStatus } from '../../../shared/lib/errorMessage'

export function AllocatedStockMove({ projectId, workOrderId, allocation, blocked, onLocked }: {
  projectId: string; workOrderId: string; allocation: StockAllocationDto; blocked: boolean; onLocked: (locked: boolean) => void
}) {
  const mutation = useAllocatedStockTransfer(projectId, workOrderId)
  const userId = useCurrentUserQuery().data?.userId
  const role = useProjectMembersQuery(projectId).data?.find((member) => member.userId === userId && member.memberStatus === 'active')?.projectRole
  const writable = role === 'editor' || role === 'owner'
  const [location, setLocation] = useState('')
  const [quantity, setQuantity] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [unconfirmed, setUnconfirmed] = useState<AllocatedStockTransferInput | null>(null)
  const locked = mutation.isPending || Boolean(unconfirmed)
  useEffect(() => { onLocked(locked); return () => onLocked(false) }, [locked, onLocked])
  if (!writable) return <p>Only an editor or owner can move allocated stock.</p>
  async function move() {
    if (mutation.isPending || blocked) return
    setFailed(false)
    let input: AllocatedStockTransferInput
    try {
      const text = quantity.trim()
      if (!unconfirmed && !/^\d+(?:\.\d{1,4})?$/.test(text)) throw new Error('Use a positive quantity with at most four decimal places.')
      const amount = unconfirmed ? unconfirmed.quantity : Number(text)
      if (!unconfirmed && (!location.trim() || amount <= 0 || amount > allocation.remaining)) throw new Error('Choose a destination and an amount within the remaining allocation.')
      input = unconfirmed ?? { projectId, workOrderId, allocationId: allocation.allocationId,
        fromInventoryId: allocation.inventoryId, toLocation: location.trim(), quantity: amount, requestId: crypto.randomUUID() }
    } catch (error) { setFailed(true); setMessage(errorMessage(error)); return }
    setMessage(null)
    try {
      const result = await mutation.mutateAsync(input)
      setUnconfirmed(null); setQuantity(''); setLocation(''); setMessage(`Allocated stock moved. Transfer: ${result.transferId}`)
    } catch (error) {
      setFailed(true)
      const status = errorStatus(error)
      setUnconfirmed(status === null || status >= 500 ? input : null); setMessage(errorMessage(error))
    }
  }
  return <form aria-label="Move allocated stock" onSubmit={(event) => { event.preventDefault(); void move() }}>
    <p>Moves stock and its reservation together. A partial move splits the allocation.</p>
    <label>Allocated destination<input maxLength={100} value={location} disabled={locked || blocked || allocation.status !== 'open'} onChange={(event) => setLocation(event.target.value)} /></label>
    <label>Allocated quantity<input inputMode="decimal" value={quantity} disabled={locked || blocked || allocation.status !== 'open'} onChange={(event) => setQuantity(event.target.value)} /></label>
    <button disabled={mutation.isPending || blocked || (!unconfirmed && allocation.status !== 'open')}>{unconfirmed ? 'Retry allocated stock move' : 'Move reserved stock'}</button>
    {unconfirmed && <p role="alert">The result is unconfirmed. Retry the same move before changing the allocation.</p>}
    {message && <p role={failed ? 'alert' : 'status'}>{message}</p>}
  </form>
}
