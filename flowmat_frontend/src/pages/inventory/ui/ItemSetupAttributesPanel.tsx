import { useState, type FormEvent } from 'react'
import { useItemSetupAttributes } from '../../../entities/catalog/api/useSetupAttributes'
import { errorMessage, errorStatus } from '../../../shared/lib/errorMessage'
import { attributeRows, attributesInput, type AttributeRow } from '../model/setupAttributesModel'
import { SetupAttributeFields } from './SetupAttributeFields'
export function ItemSetupAttributesPanel({ itemId, projectId }: { itemId: string; projectId: string }) {
  const { query, save } = useItemSetupAttributes(itemId, projectId)
  const [draft, setDraft] = useState<{ rows: AttributeRow[]; version: number } | null>(null)
  const [inputError, setInputError] = useState<string | null>(null)
  const current = query.data
  const rows = draft?.rows ?? attributeRows(current?.attributes ?? {})
  const status = errorStatus(save.error)
  const unconfirmed = Boolean(save.error) && !(status != null && status >= 400 && status < 500)
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!current) return
    const parsed = attributesInput(rows); setInputError(parsed.error); if (parsed.error) return
    const version = draft?.version ?? current.version
    setDraft({ rows, version })
    try { await save.mutateAsync({ attributes: parsed.attributes, expectedVersion: version }); setDraft(null) } catch { /* Keep retry snapshot. */ }
  }
  return <section aria-label="Item setup attributes" style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
    <strong>Setup attributes</strong>
    <p className="inspector-hint">Describe setup dimensions such as color and mold. Equipment rules match all named values exactly; names and values are case sensitive.</p>
    <form onSubmit={(event) => void submit(event)} style={{ display: 'grid', gap: 6 }}>
      <SetupAttributeFields label="Attribute" rows={rows} disabled={!current || query.isError || save.isPending || unconfirmed}
        onChange={(next) => { setDraft({ rows: next, version: draft?.version ?? current!.version }); setInputError(null) }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button type="submit" disabled={!current || query.isError || query.isFetching || save.isPending}>Save setup attributes</button>
        <button type="button" disabled={save.isPending || query.isFetching} onClick={() => {
          setDraft(null); setInputError(null); save.reset(); void query.refetch()
        }}>Reload current attributes</button>
      </div>
    </form>
    {(inputError || save.error || query.isError) && <p role="alert">{inputError ?? errorMessage(save.error ?? query.error)}</p>}
    {unconfirmed && <p role="status">Attributes save is unconfirmed. Retry these values to recover the saved attributes.</p>}
    <p className="inspector-hint">Remove every attribute to clear them. Reload discards unsaved edits.</p>
  </section>
}
