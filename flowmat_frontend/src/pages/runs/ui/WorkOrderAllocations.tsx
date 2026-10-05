import { useState } from 'react'
import { AllocatedStockMove } from './AllocatedStockMove'
import { useStockAllocationMutations, useStockAllocationsQuery } from '../../../entities/production/api/useStockAllocations'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import type { WorkOrderDto } from '../../../shared/types/api'
import { allocationPlace, canAllocateFromBom, hasOpen, planSummary } from '../model/allocationModel'

const cell = { padding: '4px 6px' } as const
const num = { ...cell, textAlign: 'right', whiteSpace: 'nowrap' } as const

/**
 * Stock reserved for the work order (docs/domain/stock-allocation.md): what is allocated, what its runs used, what was
 * given back. Allocating takes the BOM's materials for what is still to make, expiring LOTs first.
 */
export function WorkOrderAllocations({ order, projectId }: { order: WorkOrderDto; projectId: string }) {
  const [moveId, setMoveId] = useState<string | null>(null)
  const [moveLocked, setMoveLocked] = useState(false)
  const query = useStockAllocationsQuery(order.workOrderId)
  const { allocate, release, releaseAll } = useStockAllocationMutations(projectId, order.workOrderId)
  const allocations = query.data?.allocations ?? []
  const plan = allocate.data?.plan ?? []
  const failure = allocate.isError ? allocate.error : release.isError ? release.error : releaseAll.isError ? releaseAll.error : null
  const stockBusy = allocate.isPending || release.isPending || releaseAll.isPending
  const busy = stockBusy || moveLocked
  const moving = allocations.find((allocation) => allocation.allocationId === moveId)
  if (allocations.length === 0 && !canAllocateFromBom(order)) return null

  return (
    <section aria-label="Allocated stock" style={{ display: 'grid', gap: 6, fontSize: 12, marginTop: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <strong>Allocated stock</strong>
        {canAllocateFromBom(order) && (
          <button type="button" disabled={busy} style={{ fontSize: 11 }} onClick={() => allocate.mutate()}>Allocate materials</button>
        )}
        {hasOpen(allocations) && (
          <button type="button" disabled={busy} style={{ fontSize: 11 }} onClick={() => {
            if (window.confirm('Give back everything still allocated to this order?')) releaseAll.mutate()
          }}>Release all</button>
        )}
      </div>
      {allocate.isSuccess && <span role="status">{planSummary(plan)}</span>}
      {failure && <p role="alert" style={{ color: '#dc2626', margin: 0 }}>{errorMessage(failure)}</p>}
      {allocations.length === 0
        ? <span className="inspector-hint">Nothing allocated yet; its stock can still go to other orders.</span>
        : (
          <table aria-label="Allocations" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={cell}>Material</th><th style={num}>Allocated</th><th style={num}>Used</th><th style={num}>Released</th>
                <th style={num}>Left</th><th style={cell}>Status</th><th style={cell} />
              </tr>
            </thead>
            <tbody>
              {allocations.map((allocation) => (
                <tr key={allocation.allocationId} style={{ borderBottom: '1px solid var(--border)', opacity: allocation.status === 'closed' ? 0.6 : 1 }}>
                  <td style={cell}>{allocation.itemCode ?? allocation.itemId} · {allocationPlace(allocation)}</td>
                  <td style={num}>{formatQty(allocation.quantity)}</td>
                  <td style={num}>{formatQty(allocation.consumedQuantity)}</td>
                  <td style={num}>{formatQty(allocation.releasedQuantity)}</td>
                  <td style={num}>{formatQty(allocation.remaining)}</td>
                  <td style={cell}>{allocation.status}</td>
                  <td style={cell}>
                    {allocation.status === 'open' && (
                      <button type="button" disabled={busy} style={{ fontSize: 11 }} onClick={() => release.mutate(allocation.allocationId)}>
                        Release
                      </button>
                    )}
                    {allocation.status === 'open' && <button type="button" disabled={busy} onClick={() => setMoveId(allocation.allocationId)}>Move allocated</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      {moving && <AllocatedStockMove key={`${order.workOrderId}:${moving.allocationId}`} projectId={projectId} workOrderId={order.workOrderId} allocation={moving} blocked={stockBusy} onLocked={setMoveLocked} />}
    </section>
  )
}
