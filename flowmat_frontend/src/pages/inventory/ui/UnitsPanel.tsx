import { useMemo, useState, type FormEvent } from 'react'
import { useUnitsQuery } from '../../../entities/catalog/api/useUnitsQuery'
import {
  useCreateUnitMutation,
  useDeactivateUnitMutation,
  useUpdateUnitMutation,
} from '../../../entities/catalog/api/useSaveUnitMutation'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { formatQty } from '../../../shared/lib/formatQty'
import type { UnitDto } from '../../../shared/types/api'

const UNIT_TYPE_SUGGESTIONS = ['count', 'mass', 'volume', 'length', 'area', 'time', 'energy']

const cell = { padding: '8px 6px' } as const

const EMPTY_FORM = { unitCode: '', unitName: '', unitType: 'count', baseUnitCode: '', conversionRate: '' }

/** Global unit master. Everyone can read; editing needs the master_data:manage permission. */
export function UnitsPanel({ canManage }: { canManage: boolean }) {
  const [showInactive, setShowInactive] = useState(false)
  const unitsQuery = useUnitsQuery(showInactive)
  const units = useMemo(() => unitsQuery.data ?? [], [unitsQuery.data])

  const createMutation = useCreateUnitMutation()
  const updateMutation = useUpdateUnitMutation()
  const deactivateMutation = useDeactivateUnitMutation()

  const [editing, setEditing] = useState<UnitDto | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const baseUnitsForType = units.filter(
    (unit) => unit.baseUnitCode === null && unit.activeYn === 'Y' && unit.unitType === form.unitType.trim().toLowerCase(),
  )

  function resetForm() {
    setEditing(null)
    setForm(EMPTY_FORM)
    createMutation.reset()
    updateMutation.reset()
  }

  function startEdit(unit: UnitDto) {
    setEditing(unit)
    setForm({
      unitCode: unit.unitCode,
      unitName: unit.unitName,
      unitType: unit.unitType,
      baseUnitCode: unit.baseUnitCode ?? '',
      conversionRate: String(unit.conversionRate),
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          unitId: editing.unitId,
          unitName: form.unitName.trim(),
          conversionRate: editing.baseUnitCode ? Number(form.conversionRate) : undefined,
        })
      } else {
        await createMutation.mutateAsync({
          unitCode: form.unitCode.trim(),
          unitName: form.unitName.trim(),
          unitType: form.unitType.trim(),
          baseUnitCode: form.baseUnitCode || undefined,
          conversionRate: form.baseUnitCode ? Number(form.conversionRate) : undefined,
        })
      }
      resetForm()
    } catch {
      // Surfaced through the mutation error state below the form.
    }
  }

  function toggleActive(unit: UnitDto) {
    if (unit.activeYn === 'Y') {
      if (!window.confirm(`Deactivate "${unit.unitCode}"? Existing items keep it, but it can no longer be chosen.`)) return
      deactivateMutation.mutate(unit.unitId)
    } else {
      updateMutation.mutate({ unitId: unit.unitId, activeYn: 'Y' })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const saveError = createMutation.error ?? updateMutation.error
  const actionError = deactivateMutation.error ?? (editing ? null : updateMutation.error)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: canManage ? '1fr 320px' : '1fr', gap: 24, alignItems: 'start' }}>
      <section>
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginBottom: 12, fontSize: 13 }}>
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Show inactive units
        </label>
        {unitsQuery.isLoading && <p>Loading units...</p>}
        {unitsQuery.isError && <p style={{ color: '#dc2626' }}>{errorMessage(unitsQuery.error, 'Failed to load units.')}</p>}
        {units.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={cell}>Code</th>
                <th style={cell}>Name</th>
                <th style={cell}>Type</th>
                <th style={cell}>Converts to</th>
                {canManage && <th style={cell}></th>}
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr
                  key={unit.unitId}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    opacity: unit.activeYn === 'Y' ? 1 : 0.5,
                    background: editing?.unitId === unit.unitId ? 'var(--accent-bg)' : undefined,
                  }}
                >
                  <td style={cell}><code>{unit.unitCode}</code></td>
                  <td style={cell}>{unit.unitName}</td>
                  <td style={{ ...cell, opacity: 0.7 }}>{unit.unitType}</td>
                  <td style={{ ...cell, opacity: 0.7 }}>
                    {unit.baseUnitCode ? `1 ${unit.unitCode} = ${formatQty(unit.conversionRate)} ${unit.baseUnitCode}` : 'base unit'}
                  </td>
                  {canManage && (
                    <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                      <button type="button" onClick={() => startEdit(unit)} style={{ marginRight: 4, fontSize: 12 }}>
                        Edit
                      </button>
                      <button type="button" onClick={() => toggleActive(unit)} style={{ fontSize: 12 }}>
                        {unit.activeYn === 'Y' ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {actionError && (
          <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(actionError, 'Failed to update unit.')}</p>
        )}
      </section>

      {canManage && (
        <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
          <h3 style={{ marginTop: 0 }}>{editing ? `Edit ${editing.unitCode}` : 'Add Unit'}</h3>
          <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: 10 }}>
            {!editing && (
              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8 }}>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span>Code *</span>
                  <input
                    value={form.unitCode}
                    onChange={(e) => setForm((f) => ({ ...f, unitCode: e.target.value }))}
                    placeholder="lb"
                    required
                  />
                </label>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span>Type *</span>
                  <input
                    list="unit-type-suggestions"
                    value={form.unitType}
                    onChange={(e) => setForm((f) => ({ ...f, unitType: e.target.value, baseUnitCode: '' }))}
                    required
                  />
                  <datalist id="unit-type-suggestions">
                    {UNIT_TYPE_SUGGESTIONS.map((type) => <option key={type} value={type} />)}
                  </datalist>
                </label>
              </div>
            )}
            <label style={{ display: 'grid', gap: 4 }}>
              <span>Name *</span>
              <input
                value={form.unitName}
                onChange={(e) => setForm((f) => ({ ...f, unitName: e.target.value }))}
                placeholder="Pound"
                required
              />
            </label>
            {!editing && (
              <label style={{ display: 'grid', gap: 4 }}>
                <span>Base unit</span>
                <select
                  value={form.baseUnitCode}
                  onChange={(e) => setForm((f) => ({ ...f, baseUnitCode: e.target.value }))}
                >
                  <option value="">None — this is the base unit</option>
                  {baseUnitsForType.map((unit) => (
                    <option key={unit.unitId} value={unit.unitCode}>{unit.unitCode} · {unit.unitName}</option>
                  ))}
                </select>
              </label>
            )}
            {(editing ? editing.baseUnitCode : form.baseUnitCode) && (
              <label style={{ display: 'grid', gap: 4 }}>
                <span>
                  1 {form.unitCode || 'unit'} = ? {editing?.baseUnitCode ?? form.baseUnitCode} *
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.conversionRate}
                  onChange={(e) => setForm((f) => ({ ...f, conversionRate: e.target.value }))}
                  required
                />
              </label>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : editing ? 'Save' : 'Add'}
              </button>
              {editing && (
                <button type="button" onClick={resetForm} style={{ background: 'transparent' }}>
                  Cancel
                </button>
              )}
            </div>
            {saveError && (
              <p style={{ color: '#dc2626', fontSize: 12, margin: 0 }}>{errorMessage(saveError, 'Failed to save unit.')}</p>
            )}
          </form>
        </section>
      )}
    </div>
  )
}
