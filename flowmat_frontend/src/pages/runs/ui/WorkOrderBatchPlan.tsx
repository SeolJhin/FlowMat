import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWorkOrderBatchPlanMutation, useWorkOrderPlanOrderMutation } from '../../../entities/production/api/useWorkOrderPlan'
import { useSaveWorkOrderMutation } from '../../../entities/production/api/useWorkOrders'
import { errorMessage } from '../../../shared/lib/errorMessage'
import type { WorkOrderDto } from '../../../shared/types/api'
import { batchDrafts, batchPlannable, defaultPlanFrom, orderSummary, planInput, planSummary } from '../model/workOrderPlanModel'

/**
 * Plans several work orders at once (docs/domain/equipment-schedule.md P8-P12): in the order they are ticked, each takes
 * the earliest dates on its equipment after the ones ticked before it. Drafts take the dates together; an approved order
 * keeps its dates until the project owner reschedules it. **Suggest order** puts the ticked orders in the order with the
 * fewest changeovers on each piece of equipment (P13-P16).
 */
export function WorkOrderBatchPlan({ projectId, orders }: { projectId: string; orders: WorkOrderDto[] }) {
  const queryClient = useQueryClient()
  const candidates = batchPlannable(orders)
  const [picked, setPicked] = useState<string[]>([])
  const [from, setFrom] = useState(() => defaultPlanFrom({ plannedStartAt: null }, new Date()))
  const suggest = useWorkOrderBatchPlanMutation()
  const reorder = useWorkOrderPlanOrderMutation()
  const [orderNote, setOrderNote] = useState<string | null>(null)
  const save = useSaveWorkOrderMutation(projectId)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<unknown>(null)
  const result = suggest.data
  const drafts = result ? batchDrafts(result.lines, orders) : []
  const done = saved !== null && saveError === null

  function toggle(workOrderId: string, on: boolean) {
    setPicked((ids) => (on ? [...ids, workOrderId] : ids.filter((id) => id !== workOrderId)))
    suggest.reset()
    reorder.reset()
    setOrderNote(null)
    setSaved(null)
    setSaveError(null)
  }

  function suggestOrder() {
    const start = new Date(from)
    reorder.mutate(
      { projectId, workOrderIds: picked, from: Number.isNaN(start.getTime()) ? undefined : start.toISOString() },
      {
        onSuccess: (answer) => {
          setPicked(answer.workOrderIds)
          setOrderNote(orderSummary(answer))
          suggest.reset()
          setSaved(null)
          setSaveError(null)
        },
      },
    )
  }

  function ask() {
    const start = new Date(from)
    if (Number.isNaN(start.getTime()) || picked.length === 0) return
    setSaved(null)
    setSaveError(null)
    suggest.mutate({ projectId, workOrderIds: picked, from: start.toISOString() })
  }

  // One update per draft, in the batch's order; a refusal stops the rest and says how many were saved before it.
  async function applyDates() {
    setSaving(true)
    setSaveError(null)
    let count = 0
    try {
      for (const { order, plan } of drafts) {
        await save.mutateAsync({ workOrderId: order.workOrderId, ...planInput(order, plan) })
        count += 1
      }
    } catch (error) {
      setSaveError(error)
    } finally {
      setSaving(false)
      setSaved(count)
      void queryClient.invalidateQueries({ queryKey: ['work-order-readiness'] })
    }
  }

  if (candidates.length < 2) return null
  return (
    <section aria-label="Plan several orders" style={{ marginTop: 16 }}>
      <details>
        <summary>Plan several orders</summary>
        <p className="inspector-hint">
          Tick orders in the order they should run; each takes the earliest dates on its equipment after the ones ticked
          before it. Nothing changes until drafts take the dates.
        </p>
        {candidates.map((order) => {
          const place = picked.indexOf(order.workOrderId)
          return (
            <label key={order.workOrderId} style={{ display: 'block', fontSize: 12 }}>
              <input
                type="checkbox"
                checked={place >= 0}
                onChange={(event) => toggle(order.workOrderId, event.target.checked)}
              />{' '}
              {place >= 0 ? `${place + 1}. ` : ''}{order.workOrderNumber} {order.workOrderTitle} · {order.workOrderStatus}
            </label>
          )
        })}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, marginTop: 6 }}>
          <label>
            Plan from{' '}
            <input aria-label="Plan several from" type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <button type="button" onClick={suggestOrder} disabled={picked.length < 2 || reorder.isPending}
            title="Fewest changeovers on each piece of equipment">
            {reorder.isPending ? 'Ordering...' : 'Suggest order'}
          </button>
          <button type="button" onClick={ask} disabled={picked.length === 0 || !from || suggest.isPending}>
            {suggest.isPending ? 'Suggesting...' : `Suggest dates for ${picked.length} order${picked.length === 1 ? '' : 's'}`}
          </button>
        </div>
        {orderNote && <p aria-label="Suggested order" role="status" style={{ fontSize: 12 }}>{orderNote}</p>}
        {reorder.isError && (
          <p role="alert" style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(reorder.error, 'Failed to suggest an order.')}</p>
        )}
        {suggest.isError && (
          <p role="alert" style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(suggest.error, 'Failed to suggest dates.')}</p>
        )}
        {result && (
          <ol aria-label="Suggested dates" style={{ fontSize: 12, paddingLeft: 18 }}>
            {result.lines.map((line) => (
              <li key={line.workOrderId}>
                <strong>{line.workOrderNumber}</strong>{' '}
                {line.suggestion ? planSummary(line.suggestion) : <span style={{ color: '#b45309' }}>{line.problem}</span>}
                {line.suggestion && line.workOrderStatus !== 'draft' && (
                  <span className="inspector-hint"> · keeps its dates until the project owner reschedules it</span>
                )}
              </li>
            ))}
          </ol>
        )}
        {drafts.length > 0 && !done && (
          <button type="button" onClick={() => void applyDates()} disabled={saving}>
            {saving ? 'Saving...' : `Use these dates for ${drafts.length} draft${drafts.length === 1 ? '' : 's'}`}
          </button>
        )}
        {done && <p role="status" style={{ fontSize: 12 }}>Saved the dates of {saved} draft{saved === 1 ? '' : 's'}.</p>}
        {saveError !== null && (
          <p role="alert" style={{ color: '#dc2626', fontSize: 12 }}>
            {errorMessage(saveError, 'Failed to save the dates.')} {saved ?? 0} saved before it.
          </p>
        )}
      </details>
    </section>
  )
}
