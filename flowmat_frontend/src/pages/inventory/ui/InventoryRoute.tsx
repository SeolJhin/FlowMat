import { useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useItemsQuery } from '../../../entities/catalog/api/useItemsQuery'
import { useCreateItemMutation } from '../../../entities/catalog/api/useCreateItemMutation'
import { useDeleteItemMutation } from '../../../entities/catalog/api/useDeleteItemMutation'
import { useUpdateItemMutation } from '../../../entities/catalog/api/useUpdateItemMutation'
import { useUnitsQuery } from '../../../entities/catalog/api/useUnitsQuery'
import { useMyPermissionsQuery } from '../../../entities/auth/api/useMyPermissionsQuery'
import type { ItemDto } from '../../../shared/types/api'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { StockPanel } from './StockPanel'
import { CountPanel } from './CountPanel'
import { MovementsTab } from './MovementsTab'
import { UnitsPanel } from './UnitsPanel'
import { LotPanel } from './LotPanel'
import { BomPanel } from './BomPanel'
import { EquipmentPanel } from './EquipmentPanel'
import { QualityPanel } from './QualityPanel'
import { StockAnalysisPanel } from './StockAnalysisPanel'

const TABS = ['items', 'stock', 'count', 'movements', 'analysis', 'lots', 'quality', 'boms', 'units', 'equipment'] as const
type Tab = (typeof TABS)[number]
const TAB_LABELS: Record<Tab, string> = {
  items: 'Items',
  stock: 'Stock',
  count: 'Count',
  movements: 'Movements',
  analysis: 'Analysis',
  lots: 'LOTs',
  quality: 'Quality',
  boms: 'BOMs',
  units: 'Units',
  equipment: 'Equipment',
}

const ITEM_TYPE_SUGGESTIONS = ['generic', 'raw_material', 'component', 'semi_finished', 'finished_good', 'consumable']

const RESOURCE_CATEGORIES = ['material', 'labor', 'energy', 'equipment', 'other']
const ITEM_STATUSES = ['active', 'inactive', 'discontinued']

export function InventoryRoute() {
  const { projectId = '' } = useParams<{ projectId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const tab: Tab = (TABS as readonly string[]).includes(requestedTab ?? '') ? (requestedTab as Tab) : 'items'
  const itemsQuery = useItemsQuery(projectId)
  const items = itemsQuery.data ?? []
  // Include inactive units so items that still reference one keep a readable label.
  const units = useUnitsQuery(true).data ?? []
  const unitLabel = new Map(units.map((unit) => [unit.unitId, unit.unitCode]))
  const canManageMasterData = useMyPermissionsQuery().data?.canManageMasterData ?? false

  const createMutation = useCreateItemMutation()
  const updateMutation = useUpdateItemMutation()
  const deleteMutation = useDeleteItemMutation(projectId)

  const [editingItem, setEditingItem] = useState<ItemDto | null>(null)
  const EMPTY_ITEM_FORM = {
    itemCode: '',
    itemName: '',
    itemType: 'generic',
    resourceCategory: 'material',
    unitId: '',
    itemStatus: 'active',
    lotManageYn: false,
    safetyStockQty: '',
    leadTimeDays: '',
    unitCost: '',
  }
  const [form, setForm] = useState(EMPTY_ITEM_FORM)

  function resetForm() {
    setForm(EMPTY_ITEM_FORM)
    setEditingItem(null)
    createMutation.reset()
    updateMutation.reset()
  }

  function startEdit(item: ItemDto) {
    setEditingItem(item)
    setForm({
      itemCode: item.itemCode,
      itemName: item.itemName,
      itemType: item.itemType ?? 'generic',
      resourceCategory: item.resourceCategory ?? 'material',
      unitId: item.unitId ?? '',
      itemStatus: item.itemStatus,
      lotManageYn: item.lotManageYn === 'Y',
      safetyStockQty: item.safetyStockQty ? String(item.safetyStockQty) : '',
      leadTimeDays: item.leadTimeDays != null ? String(item.leadTimeDays) : '',
      unitCost: item.unitCost ? String(item.unitCost) : '',
    })
  }

  /** Blank safety stock or unit cost means "none" (0 when editing); blank lead time is left out. */
  function reorderFields(creating: boolean) {
    const safety = form.safetyStockQty.trim()
    const lead = form.leadTimeDays.trim()
    const cost = form.unitCost.trim()
    return {
      safetyStockQty: safety ? Number(safety) : creating ? undefined : 0,
      leadTimeDays: lead ? Number(lead) : undefined,
      unitCost: cost ? Number(cost) : creating ? undefined : 0,
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          itemId: editingItem.itemId,
          projectId,
          itemName: form.itemName,
          itemType: form.itemType.trim() || undefined,
          resourceCategory: form.resourceCategory,
          unitId: form.unitId,
          itemStatus: form.itemStatus,
          lotManageYn: form.lotManageYn ? 'Y' : 'N',
          ...reorderFields(false),
        })
      } else {
        await createMutation.mutateAsync({
          projectId,
          itemCode: form.itemCode,
          itemName: form.itemName,
          itemType: form.itemType.trim() || undefined,
          resourceCategory: form.resourceCategory,
          unitId: form.unitId || undefined,
          itemStatus: form.itemStatus,
          lotManageYn: form.lotManageYn ? 'Y' : 'N',
          ...reorderFields(true),
        })
      }
      resetForm()
    } catch {
      // Surfaced through the mutation error state below the form.
    }
  }

  function handleDelete(itemId: string) {
    if (!window.confirm('Delete this item?')) return
    deleteMutation.mutate(itemId, {
      onSuccess: () => {
        if (editingItem?.itemId === itemId) resetForm()
      },
    })
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div style={{ padding: 32, maxWidth: 1120, margin: '0 auto' }}>
      <Link to="/" style={{ fontSize: 13, color: 'var(--accent)' }}>Back to home</Link>
      <h1>Inventory</h1>

      <div role="tablist" style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            onClick={() => setSearchParams(name === 'items' ? {} : { tab: name }, { replace: true })}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: tab === name ? '2px solid var(--accent)' : '2px solid transparent',
              borderRadius: 0,
              padding: '8px 14px',
              fontWeight: tab === name ? 600 : 400,
              opacity: tab === name ? 1 : 0.65,
            }}
          >
            {name === 'items' ? `Items (${items.length})` : TAB_LABELS[name]}
          </button>
        ))}
      </div>

      {tab === 'stock' && <StockPanel projectId={projectId} items={items} />}
      {tab === 'count' && <CountPanel projectId={projectId} items={items} />}
      {tab === 'movements' && <MovementsTab projectId={projectId} items={items} />}
      {tab === 'analysis' && <StockAnalysisPanel projectId={projectId} />}
      {tab === 'lots' && <LotPanel projectId={projectId} items={items} />}
      {tab === 'quality' && <QualityPanel projectId={projectId} items={items} />}
      {tab === 'boms' && <BomPanel projectId={projectId} items={items} units={units} />}
      {tab === 'units' && <UnitsPanel canManage={canManageMasterData} />}
      {tab === 'equipment' && <EquipmentPanel projectId={projectId} />}

      {tab === 'items' && (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        <section>
          {itemsQuery.isLoading && <p>Loading items...</p>}
          {itemsQuery.isError && <p style={{ color: '#dc2626' }}>Failed to load items.</p>}
          {deleteMutation.isError && (
            <p role="alert" style={{ color: '#dc2626', fontSize: 13 }}>
              {errorMessage(deleteMutation.error, 'The item could not be deleted.')}
            </p>
          )}
          {!itemsQuery.isLoading && items.length === 0 && (
            <p className="inspector-hint">No items found. Add one from the form on the right.</p>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '8px 6px' }}>Code</th>
                <th style={{ padding: '8px 6px' }}>Name</th>
                <th style={{ padding: '8px 6px' }}>Category</th>
                <th style={{ padding: '8px 6px' }}>Unit</th>
                <th style={{ padding: '8px 6px' }}>LOT</th>
                <th style={{ padding: '8px 6px' }}>Status</th>
                <th style={{ padding: '8px 6px' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.itemId}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: editingItem?.itemId === item.itemId ? 'var(--accent-bg)' : undefined,
                  }}
                >
                  <td style={{ padding: '8px 6px' }}><code>{item.itemCode}</code></td>
                  <td style={{ padding: '8px 6px' }}>{item.itemName}</td>
                  <td style={{ padding: '8px 6px', opacity: 0.7 }}>{item.resourceCategory ?? '-'}</td>
                  <td style={{ padding: '8px 6px', opacity: 0.7 }}>
                    {item.unitId ? unitLabel.get(item.unitId) ?? item.unitId : '-'}
                  </td>
                  <td style={{ padding: '8px 6px', opacity: 0.7 }}>{item.lotManageYn === 'Y' ? 'tracked' : '-'}</td>
                  <td style={{ padding: '8px 6px', opacity: 0.7 }}>{item.itemStatus}</td>
                  <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>
                    <button type="button" onClick={() => startEdit(item)} style={{ marginRight: 4, fontSize: 12 }}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.itemId)}
                      style={{ fontSize: 12, color: '#dc2626', border: '1px solid #fca5a5', background: '#fef2f2' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
          <h3 style={{ marginTop: 0 }}>{editingItem ? 'Edit Item' : 'Add Item'}</h3>
          <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: 10 }}>
            {!editingItem && (
              <label style={{ display: 'grid', gap: 4 }}>
                <span>Code *</span>
                <input
                  value={form.itemCode}
                  onChange={(e) => setForm((f) => ({ ...f, itemCode: e.target.value }))}
                  placeholder="e.g. MAT-001"
                  required
                />
              </label>
            )}
            <label style={{ display: 'grid', gap: 4 }}>
              <span>Name *</span>
              <input value={form.itemName} onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))} required />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>Type</span>
              <input
                list="item-type-suggestions"
                value={form.itemType}
                onChange={(e) => setForm((f) => ({ ...f, itemType: e.target.value }))}
              />
              <datalist id="item-type-suggestions">
                {ITEM_TYPE_SUGGESTIONS.map((type) => <option key={type} value={type} />)}
              </datalist>
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>Category</span>
              <select value={form.resourceCategory} onChange={(e) => setForm((f) => ({ ...f, resourceCategory: e.target.value }))}>
                {RESOURCE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>Unit</span>
              <select value={form.unitId} onChange={(e) => setForm((f) => ({ ...f, unitId: e.target.value }))}>
                <option value="">None</option>
                {units
                  .filter((unit) => unit.activeYn === 'Y' || unit.unitId === form.unitId)
                  .map((unit) => (
                    <option key={unit.unitId} value={unit.unitId}>
                      {unit.unitCode} · {unit.unitName} ({unit.unitType})
                    </option>
                  ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>Status</span>
              <select value={form.itemStatus} onChange={(e) => setForm((f) => ({ ...f, itemStatus: e.target.value }))}>
                {ITEM_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={form.lotManageYn}
                onChange={(e) => setForm((f) => ({ ...f, lotManageYn: e.target.checked }))}
              />
              <span>Track stock per LOT</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <label style={{ display: 'grid', gap: 4 }}>
                <span>Safety stock</span>
                <input
                  inputMode="decimal"
                  value={form.safetyStockQty}
                  placeholder="not watched"
                  onChange={(e) => setForm((f) => ({ ...f, safetyStockQty: e.target.value }))}
                />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span>Lead time (days)</span>
                <input
                  inputMode="numeric"
                  value={form.leadTimeDays}
                  onChange={(e) => setForm((f) => ({ ...f, leadTimeDays: e.target.value }))}
                />
              </label>
            </div>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>Unit cost</span>
              <input
                inputMode="decimal"
                value={form.unitCost}
                placeholder="per unit of this item"
                onChange={(e) => setForm((f) => ({ ...f, unitCost: e.target.value }))}
              />
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : editingItem ? 'Save' : 'Add'}
              </button>
              {editingItem && (
                <button type="button" onClick={resetForm} style={{ background: 'transparent' }}>
                  Cancel
                </button>
              )}
            </div>
            {(createMutation.isError || updateMutation.isError) && (
              <p style={{ color: '#dc2626', fontSize: 12, margin: 0 }}>
                {errorMessage(createMutation.error ?? updateMutation.error, 'Failed to save item.')}
              </p>
            )}
          </form>
        </section>
      </div>
      )}
    </div>
  )
}
