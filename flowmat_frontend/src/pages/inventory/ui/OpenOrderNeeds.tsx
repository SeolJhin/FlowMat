import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useBomsQuery } from '../../../entities/bom/api/useBoms'
import { useItemsQuery } from '../../../entities/catalog/api/useItemsQuery'
import { useMaterialRequirementsQuery } from '../../../entities/production/api/useMaterialRequirements'
import { useSaveWorkOrderMutation, useWorkOrdersQuery } from '../../../entities/production/api/useWorkOrders'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import { isActiveItem } from '../model/itemStatusModel'
import { leftAfterOrders, needLabel, needsCsv, packsFor, subAssemblyDrafts } from '../model/stockAlertModel'

const cell = { padding: '4px 6px' } as const
const num = { ...cell, textAlign: 'right', whiteSpace: 'nowrap' } as const

/**
 * What open work orders still need (docs/domain/material-requirements.md): the materials short against usable stock
 * first, with the orders that need them, and what each has left after them against its safety stock. Hidden when no open
 * order has a BOM.
 */
export function OpenOrderNeeds({ projectId }: { projectId: string }) {
  const needsQuery = useMaterialRequirementsQuery(projectId)
  const needs = needsQuery.data
  const itemById = new Map((useItemsQuery(projectId).data ?? []).map((item) => [item.itemId, item]))
  // BOMs and work orders are only fetched when a sub-assembly is short, to draft its orders (docs/domain/multi-level-bom.md).
  const shortMadeHere = (needs?.lines ?? []).some((line) => line.madeHere && line.shortage > 0)
  const bomsQuery = useBomsQuery(shortMadeHere ? projectId : '')
  const ordersQuery = useWorkOrdersQuery(shortMadeHere ? projectId : '')
  const saveOrder = useSaveWorkOrderMutation(projectId)
  const [drafted, setDrafted] = useState<{ error: boolean; text: string } | null>(null)
  const [drafting, setDrafting] = useState(false)
  if (needsQuery.isError) {
    return <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(needsQuery.error, 'Failed to add up open work orders.')}</p>
  }
  if (!needs || (needs.orders === 0 && needs.problems.length === 0)) return null
  const short = needs.lines.filter((line) => line.shortage > 0)
  const planned = bomsQuery.isSuccess && ordersQuery.isSuccess
    ? subAssemblyDrafts(needs.lines, bomsQuery.data, ordersQuery.data, itemById)
    : { drafts: [], skipped: [] }
  const after = new Map(needs.lines.map((line) => [line.itemId, leftAfterOrders(line, itemById.get(line.itemId)?.safetyStockQty)]))
  // Covered materials the orders take under their safety stock; the short ones are counted as short.
  const underSafety = needs.lines.filter((line) => line.shortage === 0 && (after.get(line.itemId)?.underSafety ?? 0) > 0)

  /** Every short sub-assembly as a draft work order, one after another; stops at the first refusal. */
  async function draftAll() {
    const list = planned.drafts.map((one) => `${one.itemCode} ${formatQty(one.quantity)}`).join(', ')
    if (!window.confirm(`Draft work orders for ${list}? They count in these needs once approved.`)) return
    setDrafting(true)
    const done: string[] = []
    try {
      for (const one of planned.drafts) {
        const order = await saveOrder.mutateAsync({
          workOrderTitle: `${one.itemCode} for open work orders`, targetItemId: one.itemId, targetQuantity: one.quantity, bomId: one.bomId,
        })
        done.push(`${order.workOrderNumber} (${one.itemCode} ${formatQty(one.quantity)})`)
      }
      setDrafted({ error: false, text: `Drafted ${done.join(', ')}. Approve them on Work Orders.` })
    } catch (error) {
      setDrafted({ error: true, text: `${done.length ? `Drafted ${done.join(', ')}; then: ` : ''}${errorMessage(error)}` })
    } finally {
      setDrafting(false)
    }
  }

  function download() {
    if (!needs) return
    const url = URL.createObjectURL(new Blob([needsCsv(needs.lines, itemById)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `work-order-needs-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section aria-label="Open work order needs" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <strong style={{ fontSize: 13, color: short.length ? '#b91c1c' : underSafety.length ? '#b45309' : undefined }}>
          {short.length === 0
            ? `${needs.orders} open work order${needs.orders === 1 ? '' : 's'}: all ${needs.lines.length} materials covered`
            : `${needs.orders} open work order${needs.orders === 1 ? '' : 's'}: ${short.length} material${short.length === 1 ? '' : 's'} short`}
          {underSafety.length > 0 && ` · ${underSafety.length} left under safety stock`}
        </strong>
        {needs.lines.length > 0 && (
          <button type="button" style={{ fontSize: 11, marginLeft: 'auto' }} onClick={download}>
            Download CSV
          </button>
        )}
      </div>
      {needs.problems.length > 0 && (
        <p role="note" style={{ color: '#b45309', fontSize: 12, margin: '4px 0 0' }}>
          Not counted: {needs.problems.join('; ')}
        </p>
      )}
      {(planned.drafts.length > 0 || planned.skipped.length > 0) && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', fontSize: 12, marginTop: 4 }}>
          {planned.drafts.length > 0 && (
            <button type="button" style={{ fontSize: 11 }} disabled={drafting} onClick={() => void draftAll()}>
              {drafting
                ? 'Drafting...'
                : `Draft ${planned.drafts.length} work order${planned.drafts.length === 1 ? '' : 's'} for short sub-assemblies`}
            </button>
          )}
          {planned.skipped.length > 0 && <span className="inspector-hint">Not drafted: {planned.skipped.join('; ')}</span>}
        </div>
      )}
      {drafted && (
        <p role={drafted.error ? 'alert' : 'status'} style={{ fontSize: 12, margin: '4px 0 0', color: drafted.error ? '#b91c1c' : '#047857' }}>
          {drafted.text}{' '}
          {!drafted.error && <Link to={`/projects/${encodeURIComponent(projectId)}/runs?view=work-orders`}>Open Work Orders</Link>}
        </p>
      )}
      <details open={short.length > 0 || underSafety.length > 0} style={{ marginTop: 6 }}>
        <summary style={{ cursor: 'pointer', fontSize: 12 }}>
          {short.length > 0 || underSafety.length > 0 ? 'Materials' : 'Show all materials'}
        </summary>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 6 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              <th style={cell}>Material</th>
              <th style={num}>Needed</th>
              <th style={num}>Usable</th>
              <th style={num}>Being made</th>
              <th style={num}>Short</th>
              <th style={num} title="Usable and being made, less what the open orders need">Left after</th>
              <th style={cell}>For</th>
            </tr>
          </thead>
          <tbody>
            {needs.lines.map((line) => (
              <tr key={line.itemId} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={cell}>
                  {line.itemCode} · {line.itemName}
                  {line.madeHere && (
                    // A sub-assembly: what stock and open orders leave short is made from its own BOM (docs/domain/multi-level-bom.md).
                    <span style={{ display: 'block', fontSize: 11, opacity: 0.7 }}>
                      made here · own BOM
                      {line.shortage > 0 && (
                        <>
                          {' · '}
                          <Link aria-label={`Make ${line.itemCode} with a work order`}
                            to={`/projects/${encodeURIComponent(projectId)}/runs?view=work-orders&make=${encodeURIComponent(line.itemId)}&quantity=${line.shortage}`}>
                            Make {formatQty(line.shortage)}
                          </Link>
                        </>
                      )}
                    </span>
                  )}
                  {(() => {
                    // A shortage of an item that takes no new stock cannot be ordered away (docs/domain/item-status.md).
                    const item = itemById.get(line.itemId)
                    return item && !isActiveItem(item) ? (
                      <span style={{ display: 'block', fontSize: 11, color: '#b45309' }}>{item.itemStatus}: not reordered</span>
                    ) : null
                  })()}
                </td>
                <td style={num}>
                  {formatQty(line.required)} {line.unit ?? ''}
                </td>
                <td style={num}>{formatQty(line.usable)}</td>
                <td style={num}>{line.plannedSupply ? formatQty(line.plannedSupply) : '-'}</td>
                <td style={{ ...num, color: line.shortage ? '#b91c1c' : undefined, fontWeight: line.shortage ? 600 : 400 }}>
                  {line.shortage ? formatQty(line.shortage) : '-'}
                  {line.shortage > 0 && itemById.get(line.itemId)?.purchaseUnit && (
                    <div className="inspector-hint" style={{ fontWeight: 400 }}>
                      {packsFor(line.shortage, itemById.get(line.itemId)?.purchaseUnitQty)} {itemById.get(line.itemId)?.purchaseUnit}
                    </div>
                  )}
                </td>
                {(() => {
                  // Under the item's safety stock once these orders are made: the reorder list would flag it then.
                  const left = after.get(line.itemId)
                  const safety = itemById.get(line.itemId)?.safetyStockQty
                  return (
                    <td style={{ ...num, color: left?.underSafety ? '#b45309' : undefined }}>
                      {formatQty(left?.left ?? 0)}
                      {left?.underSafety ? (
                        <div style={{ fontSize: 11 }}>{formatQty(left.underSafety)} under safety {formatQty(safety ?? 0)}</div>
                      ) : null}
                    </td>
                  )
                })()}
                <td style={{ ...cell, opacity: 0.8 }}>
                  {line.orders.map((order) => needLabel(order, formatQty(order.required))).join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  )
}
