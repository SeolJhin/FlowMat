import { useRunByProductValueQuery } from '../../../entities/production/api/useRunCost'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { costBasisLabel } from '../model/costBasisModel'
import { formatQty } from './runDisplay'

/** Recorded value is separate from material cost; waste disposal is not priced from Item.unitCost. */
export function RunByProductValuePanel({ runId }: { runId: string }) {
  const query = useRunByProductValueQuery(runId)
  const value = query.data
  if (!query.isError && !value?.lines?.length) return null
  return <section aria-label="By-product value" style={{ marginTop: 16 }}>
    <h4>By-product value</h4>
    <p className="inspector-hint">Displayed separately; material cost is not reduced.</p>
    {query.isError && <div><p role="alert">{errorMessage(query.error, 'Could not calculate by-product value.')}</p>
      <button type="button" disabled={query.isFetching} onClick={() => void query.refetch()}>Retry value lookup</button></div>}
    {!query.isError && value?.lines?.length ? <>
      <p aria-label="By-product price basis" className="inspector-hint">{costBasisLabel(value)}</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead><tr><th style={{ textAlign: 'left' }}>Item</th><th>Recorded</th><th>Value</th></tr></thead>
        <tbody>{value.lines.map((line) => <tr key={line.itemId}>
          <td>{line.itemCode}{line.itemName ? ` · ${line.itemName}` : ''}
            {line.costBasis === 'ESTIMATED' && <span> · estimated price</span>}</td>
          <td style={{ textAlign: 'right' }}>{line.quantity == null ? 'unknown quantity' : `${formatQty(line.quantity)} ${line.unit ?? ''}`}</td>
          <td style={{ textAlign: 'right' }}>{line.value == null ? 'unknown value' : formatQty(line.value)}</td>
        </tr>)}</tbody>
      </table>
      <p>{value.valueComplete ? 'Total value' : 'Known value subtotal'}: {formatQty(value.byProductValue)}</p>
      {!value.valueComplete && <p className="inspector-hint">Some by-products have no known price or compatible unit; their value is not included.</p>}
    </> : null}
  </section>
}
