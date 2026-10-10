import { useRunWasteDisposalQuery } from '../../../entities/production/api/useRunCost'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { costBasisLabel } from '../model/costBasisModel'
import { formatQty } from './runDisplay'

/** What disposing of the run's recorded waste costs; never added to material cost (docs/domain/bom-by-products.md WD5). */
export function RunWasteDisposalPanel({ runId }: { runId: string }) {
  const query = useRunWasteDisposalQuery(runId)
  const value = query.data && Array.isArray(query.data.lines) ? query.data : undefined
  if (!query.isError && !value?.lines.length) return null
  return <section aria-label="Waste disposal cost" style={{ marginTop: 16 }}>
    <h4>Waste disposal cost</h4>
    <p className="inspector-hint">Displayed separately; not added to material cost.</p>
    {query.isError && <div><p role="alert">{errorMessage(query.error, 'Could not calculate the waste disposal cost.')}</p>
      <button type="button" disabled={query.isFetching} onClick={() => void query.refetch()}>Retry disposal cost lookup</button></div>}
    {!query.isError && value?.lines.length ? <>
      <p aria-label="Disposal cost basis" className="inspector-hint">{costBasisLabel(value).replace('item prices', 'disposal costs')}</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead><tr><th style={{ textAlign: 'left' }}>Waste</th><th>Recorded</th><th>Per unit</th><th>Cost</th></tr></thead>
        <tbody>{value.lines.map((line) => <tr key={line.itemId}>
          <td>{line.itemCode}{line.itemName ? ` · ${line.itemName}` : ''}
            {line.costBasis === 'ESTIMATED' && <span> · estimated cost</span>}</td>
          <td style={{ textAlign: 'right' }}>{line.quantity == null ? 'unknown quantity' : `${formatQty(line.quantity)} ${line.unit ?? ''}`}</td>
          <td style={{ textAlign: 'right' }}>{line.unitDisposalCost == null ? 'no disposal cost' : formatQty(line.unitDisposalCost)}</td>
          <td style={{ textAlign: 'right' }}>{line.cost == null ? 'unknown cost' : formatQty(line.cost)}</td>
        </tr>)}</tbody>
      </table>
      <p>{value.costComplete ? 'Total disposal cost' : 'Known disposal cost subtotal'}: {formatQty(value.disposalCost)}</p>
      {!value.costComplete && <p className="inspector-hint">Some waste has no disposal cost or compatible unit; it is not included. Set it on the item.</p>}
    </> : null}
  </section>
}
