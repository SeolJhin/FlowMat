import { useState, type FormEvent } from 'react'
import { useItemsQuery } from '../../../entities/catalog/api/useItemsQuery'
import {
  useEquipmentChangeoverMutations,
  useEquipmentChangeoversQuery,
} from '../../../entities/catalog/api/useEquipmentChangeovers'
import { errorMessage } from '../../../shared/lib/errorMessage'
import type { EquipmentDto } from '../../../shared/types/api'
import {
  EMPTY_CHANGEOVER_FORM,
  LONGEST_CHANGEOVER_MINUTES,
  changeoverPayload,
  changeoverSide,
  formatMinutes,
  parseMinutes,
} from '../model/changeoverModel'
import { pickableItems } from '../model/itemStatusModel'

const cell = { padding: '4px 6px' } as const

/**
 * How long the equipment takes to switch from making one item to another (docs/domain/equipment-changeover.md). Work
 * order readiness adds the time when the order planned before on the same equipment makes something else.
 */
export function EquipmentChangeovers({ equipment }: { equipment: EquipmentDto }) {
  const rulesQuery = useEquipmentChangeoversQuery(equipment.equipmentId)
  const items = pickableItems(useItemsQuery(equipment.projectId).data ?? [])
  const { add, update, remove } = useEquipmentChangeoverMutations(equipment.equipmentId)
  const [form, setForm] = useState(EMPTY_CHANGEOVER_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ changeoverId: string; minutes: string; note: string | null } | null>(null)
  const rules = rulesQuery.data ?? []
  const problem = formError ?? (add.isError ? errorMessage(add.error) : null)

  function submit(event: FormEvent) {
    event.preventDefault()
    const payload = changeoverPayload(form, rules)
    setFormError(payload.error)
    if (payload.input) add.mutate(payload.input, { onSuccess: () => setForm(EMPTY_CHANGEOVER_FORM) })
  }

  function saveEdit() {
    if (!editing) return
    const minutes = parseMinutes(editing.minutes)
    if (minutes === null) return
    update.mutate({ changeoverId: editing.changeoverId, minutes, note: editing.note }, { onSuccess: () => setEditing(null) })
  }

  return (
    <div role="group" aria-label="Changeovers" style={{ display: 'grid', gap: 8 }}>
      <h4 style={{ margin: 0 }}>Changeovers</h4>
      <span className="inspector-hint">
        Time to switch from making one item to the next. Exact item pairs apply before attribute rules, item wildcards and the default; making the same item again needs none
        unless that pair is set.
      </span>
      {rulesQuery.isError && <p role="alert">{errorMessage(rulesQuery.error)}</p>}
      <form aria-label="Add changeover" onSubmit={submit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
        <label>From<select value={form.fromItemId} onChange={(event) => setForm({ ...form, fromItemId: event.target.value })}>
          <option value="">Any item</option>
          {items.map((item) => <option key={item.itemId} value={item.itemId}>{changeoverSide(item.itemCode, item.itemName)}</option>)}
        </select></label>
        <label>To<select value={form.toItemId} onChange={(event) => setForm({ ...form, toItemId: event.target.value })}>
          <option value="">Any item</option>
          {items.map((item) => <option key={item.itemId} value={item.itemId}>{changeoverSide(item.itemCode, item.itemName)}</option>)}
        </select></label>
        <label>Minutes<input type="number" min={1} max={LONGEST_CHANGEOVER_MINUTES} step={1} value={form.minutes} required
          style={{ width: 80 }} onChange={(event) => setForm({ ...form, minutes: event.target.value })} /></label>
        <label>Note<input value={form.note} maxLength={500} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
        <button type="submit" disabled={add.isPending}>{add.isPending ? 'Adding...' : 'Add changeover'}</button>
        {problem && <p role="alert" style={{ flexBasis: '100%', margin: 0 }}>{problem}</p>}
      </form>
      {update.isError && <p role="alert">{errorMessage(update.error)}</p>}
      {remove.isError && <p role="alert">{errorMessage(remove.error)}</p>}
      {rules.length === 0
        ? <p className="inspector-hint">No changeover times set for item pairs or the default.</p>
        : <table aria-label="Changeover list" style={{ borderCollapse: 'collapse', width: '100%', textAlign: 'left' }}>
          <thead><tr><th style={cell}>From</th><th style={cell}>To</th><th style={cell}>Time</th><th style={cell}>Note</th>
            <th style={cell}>Actions</th></tr></thead>
          <tbody>{rules.map((rule) => {
            const isEditing = editing?.changeoverId === rule.changeoverId
            return <tr key={rule.changeoverId} style={{ borderTop: '1px solid var(--border)' }}>
              <td style={cell}>{changeoverSide(rule.fromItemCode, rule.fromItemName)}</td>
              <td style={cell}>{changeoverSide(rule.toItemCode, rule.toItemName)}</td>
              <td style={cell}>{isEditing
                ? <input type="number" aria-label="New minutes" min={1} max={LONGEST_CHANGEOVER_MINUTES} step={1} value={editing.minutes}
                  style={{ width: 80 }} onChange={(event) => setEditing({ ...editing, minutes: event.target.value })} />
                : formatMinutes(rule.minutes)}</td>
              <td style={cell}>{rule.note ?? '—'}</td>
              <td style={{ ...cell, whiteSpace: 'nowrap' }}>{isEditing
                ? <>
                  <button type="button" disabled={update.isPending || parseMinutes(editing.minutes) === null} onClick={saveEdit}>Save</button>{' '}
                  <button type="button" onClick={() => setEditing(null)}>Cancel</button>
                </>
                : <>
                  <button type="button"
                    onClick={() => setEditing({ changeoverId: rule.changeoverId, minutes: String(rule.minutes), note: rule.note })}>
                    Change time</button>{' '}
                  <button type="button" disabled={remove.isPending} onClick={() => {
                    if (window.confirm('Remove this changeover?')) remove.mutate(rule.changeoverId)
                  }}>Remove</button>
                </>}</td>
            </tr>
          })}</tbody>
        </table>}
    </div>
  )
}
