import { useState, type FormEvent } from 'react'
import { useEquipmentHourlyCost, useEquipmentHourlyCostHistory } from '../../../entities/catalog/api/useEquipmentHourlyCost'
import { errorMessage, errorStatus } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import { hourlyCostInput } from '../model/equipmentHourlyCostModel'

/** Current planning price only. The loaded version stays with dirty inputs until the editor explicitly reloads. */
export function EquipmentHourlyCostPanel({ equipmentId, projectId }: { equipmentId: string; projectId: string }) {
  const { query, save } = useEquipmentHourlyCost(equipmentId, projectId)
  const history = useEquipmentHourlyCostHistory(equipmentId)
  const rateText = (value: number | null) => (value == null ? 'not set' : `${formatQty(value)}/h`)
  const [draft, setDraft] = useState<{ text: string; version: number } | null>(null)
  const [inputError, setInputError] = useState<string | null>(null)
  const status = errorStatus(save.error)
  const unconfirmed = Boolean(save.error) && !(status != null && status >= 400 && status < 500)
  const rate = query.data
  const text = draft?.text ?? (rate?.hourlyCost == null ? '' : String(rate.hourlyCost))
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!rate) return
    const parsed = hourlyCostInput(text)
    setInputError(parsed.error)
    if (parsed.error) return
    const expectedVersion = draft?.version ?? rate.version
    // A save without editing (including clearing an unset rate) also needs a stable retry snapshot.
    setDraft({ text, version: expectedVersion })
    try {
      await save.mutateAsync({ hourlyCost: parsed.hourlyCost, expectedVersion })
      setDraft(null)
    } catch { /* Preserve the editor's values and version. */ }
  }
  const error = inputError ?? (save.error ? errorMessage(save.error) : query.isError ? errorMessage(query.error) : null)
  return <section aria-label="Equipment hourly cost" style={{ marginTop: 16, display: 'grid', gap: 6 }}>
    <strong>Equipment hourly cost</strong>
    <p className="inspector-hint" style={{ margin: 0 }}>Current planning rate for setup estimates. Material cost and actual execution cost are separate.</p>
    {rate && !query.isError && <p style={{ margin: 0, fontSize: 12 }}>
      Current planning rate: {rate.hourlyCost == null ? 'not set' : `${formatQty(rate.hourlyCost)} per hour`}
    </p>}
    <form onSubmit={(event) => void submit(event)} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'end' }}>
      <label>Hourly equipment cost <input type="number" min="0" max="9999999999.9999" step="0.0001" value={text}
        disabled={!rate || query.isError || save.isPending || unconfirmed}
        onChange={(event) => { setDraft({ text: event.target.value, version: draft?.version ?? rate!.version }); setInputError(null) }} /></label>
      <button type="submit" disabled={!rate || query.isError || query.isFetching || save.isPending}>Save hourly cost</button>
      <button type="button" disabled={save.isPending || query.isFetching} onClick={() => {
        setDraft(null); setInputError(null); save.reset(); void query.refetch()
      }}>Reload current rate</button>
    </form>
    <p className="inspector-hint" style={{ margin: 0 }}>Blank clears the rate. Zero is a known rate. Reload discards unsaved edits.</p>
    {error && <p role="alert" style={{ margin: 0, color: '#b91c1c' }}>{error}</p>}
    {unconfirmed && <p role="status" style={{ margin: 0 }}>Rate save is unconfirmed. Retry with these values to recover the saved rate.</p>}
    {(history.data?.length ?? 0) > 0 && <ul aria-label="Hourly cost changes" style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
      {history.data!.slice(0, 5).map((change) => <li key={change.version}>
        {rateText(change.previousHourlyCost)} → {rateText(change.hourlyCost)}{' '}
        <span className="inspector-hint">· {change.changedBy} · {new Date(change.changedAt).toLocaleString()}</span>
      </li>)}
    </ul>}
  </section>
}
