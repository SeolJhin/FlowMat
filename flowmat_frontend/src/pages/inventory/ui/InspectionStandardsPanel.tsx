import { useState, type FormEvent } from 'react'
import {
  useInspectionStandardMutations,
  useInspectionStandardsQuery,
  type InspectionStage,
  type InspectionStandardDto,
} from '../../../entities/quality/api/useInspectionStandards'
import {
  EMPTY_STANDARD_FORM,
  STAGES,
  STAGE_LABELS,
  limitsText,
  standardForm,
  standardPayload,
} from '../../../entities/quality/model/standardModel'
import { errorMessage } from '../../../shared/lib/errorMessage'
import type { ItemDto } from '../../../shared/types/api'

/**
 * Per item, the checks to run and their limits (docs/domain/inspection-standard.md). Inspections can follow a standard,
 * and a run's checklist shows the required ones of what it makes.
 */
export function InspectionStandardsPanel({ projectId, items }: { projectId: string; items: ItemDto[] }) {
  const standardsQuery = useInspectionStandardsQuery(projectId)
  const { save, toggle, remove } = useInspectionStandardMutations(projectId)
  const [editing, setEditing] = useState<InspectionStandardDto | null>(null)
  const [form, setForm] = useState(EMPTY_STANDARD_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const all = standardsQuery.data ?? []
  const needle = search.trim().toLowerCase()
  const shown = needle
    ? all.filter((one) => [one.itemCode, one.itemName, one.inspectionType].some((value) => (value ?? '').toLowerCase().includes(needle)))
    : all
  const saveError = formError ?? (save.isError ? errorMessage(save.error) : null)

  function reset() {
    setEditing(null)
    setForm(EMPTY_STANDARD_FORM)
    setFormError(null)
    save.reset()
  }

  function startEdit(standard: InspectionStandardDto) {
    reset()
    setEditing(standard)
    setForm(standardForm(standard))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const payload = standardPayload(form)
    setFormError(payload.error)
    if (!payload.input) return
    const input = editing ? { ...payload.input, itemId: undefined, active: editing.active } : payload.input
    // Keep the item after adding, so its next check is quick to add.
    save.mutate({ standardId: editing?.standardId ?? null, input }, {
      onSuccess: () => (editing ? reset() : setForm({ ...EMPTY_STANDARD_FORM, itemId: form.itemId, stage: form.stage })),
    })
  }

  return (
    <section aria-label="Inspection standards" style={{ marginTop: 24 }}>
      <h3 style={{ marginBottom: 4 }}>Inspection standards</h3>
      <p className="inspector-hint" style={{ marginTop: 0 }}>
        The checks each item gets and their limits. Recording an inspection can follow a standard; required production checks
        are listed on every run that makes the item.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 24, alignItems: 'start' }}>
        <div style={{ overflowX: 'auto' }}>
          {standardsQuery.isError && <p role="alert">{errorMessage(standardsQuery.error)}</p>}
          {toggle.isError && <p role="alert">{errorMessage(toggle.error)}</p>}
          {remove.isError && <p role="alert">{errorMessage(remove.error)}</p>}
          {all.length === 0 && !standardsQuery.isPending && <p className="inspector-hint">No standards yet.</p>}
          {all.length > 0 && (
            <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search standards"
              placeholder="item or check" style={{ marginBottom: 8, minWidth: 220, fontSize: 12 }} />
          )}
          {all.length > 0 && (
            <table aria-label="Standards" style={{ width: '100%', textAlign: 'left', fontSize: 13 }}>
              <thead><tr><th>Item</th><th>Check</th><th>Stage</th><th>Limits</th><th>Required</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{shown.map((standard) => (
                <tr key={standard.standardId} style={{ opacity: standard.active ? 1 : 0.6 }}>
                  <td>{standard.itemCode ?? standard.itemId}</td>
                  <td>{standard.inspectionType}</td>
                  <td>{STAGE_LABELS[standard.stage]}</td>
                  <td>{limitsText(standard.standardMin, standard.standardMax, standard.unit)}</td>
                  <td>{standard.required ? 'yes' : 'no'}</td>
                  <td>{standard.active ? 'active' : 'inactive'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button type="button" onClick={() => startEdit(standard)}>Edit</button>{' '}
                    <button type="button" disabled={toggle.isPending} onClick={() => toggle.mutate(standard)}>
                      {standard.active ? 'Deactivate' : 'Activate'}
                    </button>{' '}
                    <button type="button" disabled={remove.isPending} onClick={() => {
                      if (window.confirm(`Delete the ${standard.inspectionType} standard of ${standard.itemCode ?? standard.itemId}?`)) {
                        remove.mutate(standard.standardId)
                      }
                    }}>Delete</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
        <form onSubmit={submit} aria-label={editing ? 'Edit standard' : 'Add standard'}
          style={{ display: 'grid', gap: 8, alignContent: 'start', fontSize: 13 }}>
          <h4 style={{ margin: 0 }}>{editing ? `Edit ${editing.inspectionType}` : 'Add standard'}</h4>
          <label style={{ display: 'grid', gap: 4 }}>Item
            <select value={form.itemId} disabled={Boolean(editing)} onChange={(event) => setForm({ ...form, itemId: event.target.value })}>
              <option value="">Choose...</option>
              {items.map((item) => <option key={item.itemId} value={item.itemId}>{item.itemCode} · {item.itemName}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4 }}>Check
            <input value={form.inspectionType} maxLength={50} placeholder="Moisture, Visual, Weight..."
              onChange={(event) => setForm({ ...form, inspectionType: event.target.value })} />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>Stage
            <select value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value as InspectionStage })}>
              {STAGES.map((stage) => <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>)}
            </select>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
            <label style={{ display: 'grid', gap: 4 }}>Min
              <input inputMode="decimal" value={form.standardMin} onChange={(event) => setForm({ ...form, standardMin: event.target.value })} />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>Max
              <input inputMode="decimal" value={form.standardMax} onChange={(event) => setForm({ ...form, standardMax: event.target.value })} />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>Unit
              <input value={form.unit} maxLength={20} onChange={(event) => setForm({ ...form, unit: event.target.value })} />
            </label>
          </div>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={form.required} onChange={(event) => setForm({ ...form, required: event.target.checked })} />
            Required on every run that makes the item
          </label>
          <label style={{ display: 'grid', gap: 4 }}>Note
            <input value={form.note} maxLength={500} onChange={(event) => setForm({ ...form, note: event.target.value })} />
          </label>
          {saveError && <p role="alert" style={{ color: '#dc2626', margin: 0 }}>{saveError}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving...' : 'Save standard'}</button>
            {editing && <button type="button" onClick={reset}>Cancel</button>}
          </div>
        </form>
      </div>
    </section>
  )
}
