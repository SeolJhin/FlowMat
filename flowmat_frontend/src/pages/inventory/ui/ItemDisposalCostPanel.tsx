import { useState, type FormEvent } from 'react'
import { useItemDisposalCost } from '../../../entities/catalog/api/useItemDisposalCost'
import { errorMessage, errorStatus } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import { disposalChangeText, disposalCostInput } from '../model/disposalCostModel'

/**
 * What getting rid of one unit of the item costs, apart from its unit cost (docs/domain/bom-by-products.md WD6). The loaded
 * version stays with dirty inputs until the editor explicitly reloads.
 */
export function ItemDisposalCostPanel({ itemId, unit }: { itemId: string; unit: string }) {
  const { query, save, history } = useItemDisposalCost(itemId)
  const [draft, setDraft] = useState<{ text: string; version: number } | null>(null)
  const [inputError, setInputError] = useState<string | null>(null)
  const status = errorStatus(save.error)
  const unconfirmed = Boolean(save.error) && !(status != null && status >= 400 && status < 500)
  const cost = query.data
  const text = draft?.text ?? (cost?.disposalCost == null ? '' : String(cost.disposalCost))
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!cost) return
    const parsed = disposalCostInput(text)
    setInputError(parsed.error)
    if (parsed.error) return
    const expectedVersion = draft?.version ?? cost.version
    // A save without editing (including clearing an unset cost) also needs a stable retry snapshot.
    setDraft({ text, version: expectedVersion })
    try {
      await save.mutateAsync({ disposalCost: parsed.disposalCost, expectedVersion })
      setDraft(null)
    } catch { /* Preserve the editor's values and version. */ }
  }
  const error = inputError ?? (save.error ? errorMessage(save.error) : query.isError ? errorMessage(query.error) : null)
  return <section aria-label="Item disposal cost" style={{ marginTop: 12, display: 'grid', gap: 6 }}>
    <strong>Disposal cost</strong>
    <p className="inspector-hint" style={{ margin: 0 }}>What disposing of one {unit} costs when it comes out of a batch as waste. Not its unit cost; material cost is separate.</p>
    {cost && !query.isError && <p style={{ margin: 0, fontSize: 12 }}>
      Current disposal cost: {cost.disposalCost == null ? 'not set' : `${formatQty(cost.disposalCost)} per ${unit}`}
    </p>}
    <form onSubmit={(event) => void submit(event)} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'end' }}>
      <label>Disposal cost per {unit} <input type="number" min="0" max="9999999999.9999" step="0.0001" value={text}
        disabled={!cost || query.isError || save.isPending || unconfirmed}
        onChange={(event) => { setDraft({ text: event.target.value, version: draft?.version ?? cost!.version }); setInputError(null) }} /></label>
      <button type="submit" disabled={!cost || query.isError || query.isFetching || save.isPending}>Save disposal cost</button>
      <button type="button" disabled={save.isPending || query.isFetching} onClick={() => {
        setDraft(null); setInputError(null); save.reset(); void query.refetch()
      }}>Reload current disposal cost</button>
    </form>
    <p className="inspector-hint" style={{ margin: 0 }}>Blank clears the cost. Zero is free disposal. Reload discards unsaved edits.</p>
    {error && <p role="alert" style={{ margin: 0, color: '#b91c1c' }}>{error}</p>}
    {unconfirmed && <p role="status" style={{ margin: 0 }}>Disposal cost save is unconfirmed. Retry with these values to recover the saved cost.</p>}
    {(history.data?.length ?? 0) > 0 && <ul aria-label="Disposal cost changes" style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
      {history.data!.slice(0, 5).map((change, index) => <li key={`${change.changedAt}-${index}`}>
        {disposalChangeText(change, formatQty)}{' '}
        <span className="inspector-hint">· {change.changedBy} · {new Date(change.changedAt).toLocaleString()}</span>
      </li>)}
    </ul>}
  </section>
}
