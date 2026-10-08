import { useState, type FormEvent } from 'react'
import { useSetupChangeovers, type SetupChangeoverDto } from '../../../entities/catalog/api/useSetupAttributes'
import { errorMessage, errorStatus } from '../../../shared/lib/errorMessage'
import { attributeRows, attributesInput, type AttributeRow } from '../model/setupAttributesModel'
import { SetupAttributeFields } from './SetupAttributeFields'
interface Draft { id: string; version: number; from: AttributeRow[]; to: AttributeRow[]; priority: string; minutes: string; note: string }
const fresh = (): Draft => ({ id: crypto.randomUUID(), version: 0, from: [], to: [], priority: '', minutes: '', note: '' })
function description(values: Record<string, string>) { return Object.entries(values).map(([key, value]) => `${key}=${value}`).join(', ') || 'Any item' }
export function EquipmentSetupChangeoversPanel({ equipmentId, projectId }: { equipmentId: string; projectId: string }) {
  const { query, save, remove } = useSetupChangeovers(equipmentId, projectId)
  const [draft, setDraft] = useState<Draft>(fresh)
  const [inputError, setInputError] = useState<string | null>(null)
  const status = errorStatus(save.error)
  const unconfirmed = Boolean(save.error) && !(status != null && status >= 400 && status < 500)
  const busy = save.isPending || remove.isPending
  const locked = busy || unconfirmed || query.isError || !query.data
  function change(part: Partial<Draft>) { setDraft({ ...draft, ...part }); setInputError(null) }
  function edit(value: SetupChangeoverDto) {
    save.reset(); remove.reset(); setInputError(null)
    setDraft({ id: value.changeoverId, version: value.version, from: attributeRows(value.fromAttributes), to: attributeRows(value.toAttributes),
      priority: String(value.priority), minutes: String(value.minutes), note: value.note ?? '' })
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    const from = attributesInput(draft.from), to = attributesInput(draft.to)
    const priority = Number(draft.priority), minutes = Number(draft.minutes)
    const error = from.error ?? to.error ?? (!Object.keys(from.attributes).length && !Object.keys(to.attributes).length ? 'Specify from or to attributes. Use the existing default rule for any-to-any.' : null)
      ?? (!Number.isInteger(priority) || priority < 1 || priority > 100000 ? 'Priority must be an integer from 1 to 100000.' : null)
      ?? (!Number.isInteger(minutes) || minutes < 1 || minutes > 10080 ? 'Minutes must be an integer from 1 to 10080.' : null)
    setInputError(error); if (error) return
    try {
      await save.mutateAsync({ changeoverId: draft.id, expectedVersion: draft.version, fromAttributes: from.attributes, toAttributes: to.attributes,
        priority, minutes, note: draft.note.trim() || null })
      setDraft(fresh())
    } catch { /* A failed acknowledgement keeps identity, predicates and loaded version. */ }
  }
  return <section aria-label="Setup attribute rules" style={{ marginTop: 16, display: 'grid', gap: 8 }}>
    <strong>Setup attribute rules</strong>
    <p className="inspector-hint" style={{ margin: 0 }}>Exact item pairs apply first, then attribute rules in ascending priority, then item wildcards and the default. Every named attribute must match. A blank side matches any item.</p>
    {query.data?.map((value) => <div key={value.changeoverId} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      <span style={{ overflowWrap: 'anywhere' }}>Priority {value.priority}: {description(value.fromAttributes)} → {description(value.toAttributes)} · {value.minutes} min {value.note && `· ${value.note}`}</span>
      <button type="button" disabled={locked} onClick={() => edit(value)} aria-label={`Edit setup rule ${value.priority}`}>Edit</button>
      <button type="button" disabled={locked} aria-label={`Delete setup rule ${value.priority}`} onClick={() => {
        if (window.confirm(`Delete setup rule ${value.priority}?`)) remove.mutate(value, { onSuccess: () => { if (draft.id === value.changeoverId) setDraft(fresh()) } })
      }}>Delete</button>
    </div>)}
    {query.data?.length === 0 && <p className="inspector-hint" style={{ margin: 0 }}>No attribute rules set.</p>}
    <form aria-label="Setup rule editor" onSubmit={(event) => void submit(event)} style={{ display: 'grid', gap: 8 }}>
      <SetupAttributeFields label="From attribute" rows={draft.from} disabled={locked} onChange={(from) => change({ from })} />
      <SetupAttributeFields label="To attribute" rows={draft.to} disabled={locked} onChange={(to) => change({ to })} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'end' }}>
        <label>Rule priority<input type="number" min="1" max="100000" step="1" required disabled={locked} value={draft.priority} onChange={(event) => change({ priority: event.target.value })} /></label>
        <label>Rule minutes<input type="number" min="1" max="10080" step="1" required disabled={locked} value={draft.minutes} onChange={(event) => change({ minutes: event.target.value })} /></label>
        <label>Rule note<input maxLength={500} disabled={locked} value={draft.note} onChange={(event) => change({ note: event.target.value })} /></label>
        <button type="submit" disabled={!query.data || query.isError || query.isFetching || busy}>{draft.version ? 'Save setup rule' : 'Add setup rule'}</button>
        <button type="button" disabled={locked} onClick={() => { setDraft(fresh()); setInputError(null); save.reset(); remove.reset() }}>New setup rule</button>
        <button type="button" disabled={busy || query.isFetching} onClick={() => {
          setDraft(fresh()); setInputError(null); save.reset(); remove.reset(); void query.refetch()
        }}>Reload current rules</button>
      </div>
    </form>
    {(inputError || save.error || remove.error || query.isError) && <p role="alert">{inputError ?? errorMessage(save.error ?? remove.error ?? query.error)}</p>}
    {unconfirmed && <p role="status">Rule save is unconfirmed. Retry these values to recover the same rule.</p>}
    <p className="inspector-hint" style={{ margin: 0 }}>Lower priority wins among attribute rules. Each active rule has a different priority. Reload discards unsaved edits.</p>
  </section>
}
