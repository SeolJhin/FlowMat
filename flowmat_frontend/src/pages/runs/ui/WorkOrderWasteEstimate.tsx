import { useWorkOrderWasteEstimateQuery } from '../../../entities/production/api/useWorkOrderWasteEstimate'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from './runDisplay'

/**
 * What the waste still to come from this work order should cost to dispose of, at today's disposal costs
 * (docs/domain/bom-by-products.md WD9). Shown only when the BOM gives off waste; never added to material cost.
 */
export function WorkOrderWasteEstimate({ workOrderId }: { workOrderId: string }) {
  const query = useWorkOrderWasteEstimateQuery(workOrderId)
  const value = query.data && Array.isArray(query.data.lines) ? query.data : undefined
  if (!query.isError && !value?.lines.length) return null
  return <section aria-label="Waste disposal estimate" style={{ marginTop: 10, fontSize: 12 }}>
    <strong>Waste disposal (estimate)</strong>
    {query.isError && <p role="alert">{errorMessage(query.error, 'Could not estimate the waste disposal cost.')}</p>}
    {value && value.lines.length > 0 && <>
      <p className="inspector-hint" style={{ margin: '2px 0' }}>
        For the {formatQty(value.quantity ?? 0)} still to make, at today&apos;s disposal costs. Not added to material cost.
      </p>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {value.lines.map((line) => <li key={line.itemId}>
          {line.itemCode}: {line.quantity == null ? 'unknown quantity' : `${formatQty(line.quantity)} ${line.unit ?? ''}`}
          {' · '}{line.cost == null ? (line.unitDisposalCost == null ? 'no disposal cost' : 'unknown cost') : formatQty(line.cost)}
        </li>)}
      </ul>
      <p style={{ margin: '2px 0' }}>{value.costComplete ? 'Estimated disposal cost' : 'Known estimate subtotal'}: {formatQty(value.disposalCost)}</p>
      {!value.costComplete && <p className="inspector-hint" style={{ margin: 0 }}>Some waste has no disposal cost or unit; set it on the item.</p>}
    </>}
  </section>
}
