import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useItemsQuery } from '../../../entities/catalog/api/useItemsQuery'
import { useCreateItemMutation } from '../../../entities/catalog/api/useCreateItemMutation'
import { useDeleteItemMutation } from '../../../entities/catalog/api/useDeleteItemMutation'
import { useUpdateItemMutation } from '../../../entities/catalog/api/useUpdateItemMutation'
import type { ItemDto } from '../../../shared/types/api'

const RESOURCE_CATEGORIES = ['material', 'labor', 'energy', 'equipment', 'other']
const ITEM_STATUSES = ['active', 'inactive', 'discontinued']

export function InventoryRoute() {
  const { projectId = '' } = useParams<{ projectId: string }>()
  const itemsQuery = useItemsQuery(projectId)
  const items = itemsQuery.data ?? []

  const createMutation = useCreateItemMutation()
  const updateMutation = useUpdateItemMutation()
  const deleteMutation = useDeleteItemMutation(projectId)

  const [editingItem, setEditingItem] = useState<ItemDto | null>(null)
  const [form, setForm] = useState({
    itemCode: '',
    itemName: '',
    resourceCategory: 'material',
    itemStatus: 'active',
  })

  function resetForm() {
    setForm({ itemCode: '', itemName: '', resourceCategory: 'material', itemStatus: 'active' })
    setEditingItem(null)
  }

  function startEdit(item: ItemDto) {
    setEditingItem(item)
    setForm({
      itemCode: item.itemCode,
      itemName: item.itemName,
      resourceCategory: item.resourceCategory ?? 'material',
      itemStatus: item.itemStatus,
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (editingItem) {
      await updateMutation.mutateAsync({
        itemId: editingItem.itemId,
        projectId,
        itemName: form.itemName,
        resourceCategory: form.resourceCategory,
        itemStatus: form.itemStatus,
      })
    } else {
      await createMutation.mutateAsync({
        projectId,
        itemCode: form.itemCode,
        itemName: form.itemName,
        resourceCategory: form.resourceCategory,
        itemStatus: form.itemStatus,
      })
    }
    resetForm()
  }

  async function handleDelete(itemId: string) {
    if (!window.confirm('Delete this item?')) return
    await deleteMutation.mutateAsync(itemId)
    if (editingItem?.itemId === itemId) resetForm()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>
      <Link to="/" style={{ fontSize: 13, color: 'var(--accent)' }}>Back to home</Link>
      <h1>Inventory</h1>
      <p style={{ color: 'var(--text)', opacity: 0.6, marginTop: 0 }}>
        Project <code>{projectId}</code>
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        <section>
          {itemsQuery.isLoading && <p>Loading items...</p>}
          {itemsQuery.isError && <p style={{ color: '#dc2626' }}>Failed to load items.</p>}
          {!itemsQuery.isLoading && items.length === 0 && (
            <p className="inspector-hint">No items found. Add one from the form on the right.</p>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '8px 6px' }}>Code</th>
                <th style={{ padding: '8px 6px' }}>Name</th>
                <th style={{ padding: '8px 6px' }}>Category</th>
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
                  <td style={{ padding: '8px 6px', opacity: 0.7 }}>{item.itemStatus}</td>
                  <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>
                    <button type="button" onClick={() => startEdit(item)} style={{ marginRight: 4, fontSize: 12 }}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item.itemId)}
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
              <span>Category</span>
              <select value={form.resourceCategory} onChange={(e) => setForm((f) => ({ ...f, resourceCategory: e.target.value }))}>
                {RESOURCE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>Status</span>
              <select value={form.itemStatus} onChange={(e) => setForm((f) => ({ ...f, itemStatus: e.target.value }))}>
                {ITEM_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
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
              <p style={{ color: '#dc2626', fontSize: 12, margin: 0 }}>Failed to save item.</p>
            )}
          </form>
        </section>
      </div>
    </div>
  )
}
