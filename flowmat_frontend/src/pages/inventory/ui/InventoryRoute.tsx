import { useState, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useItemsQuery } from '../../../entities/catalog/api/useItemsQuery'
import { useCreateItemMutation } from '../../../entities/catalog/api/useCreateItemMutation'
import { useUpdateItemMutation } from '../../../entities/catalog/api/useUpdateItemMutation'
import { useDeleteItemMutation } from '../../../entities/catalog/api/useDeleteItemMutation'
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
    itemCode: '', itemName: '', resourceCategory: 'material', itemStatus: 'active',
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
    if (!window.confirm('이 아이템을 삭제하시겠습니까?')) return
    await deleteMutation.mutateAsync(itemId)
    if (editingItem?.itemId === itemId) resetForm()
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>
      <Link to="/" style={{ fontSize: 13, color: 'var(--accent)' }}>← 홈</Link>
      <h1>아이템 / 재고 관리</h1>
      <p style={{ color: 'var(--text)', opacity: 0.6, marginTop: 0 }}>프로젝트 <code>{projectId}</code></p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* List */}
        <section>
          {itemsQuery.isLoading && <p>불러오는 중…</p>}
          {itemsQuery.isError && <p style={{ color: '#dc2626' }}>불러오기 실패</p>}
          {!itemsQuery.isLoading && items.length === 0 && (
            <p className="inspector-hint">아이템이 없습니다. 오른쪽 폼으로 추가하세요.</p>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '8px 6px' }}>코드</th>
                <th style={{ padding: '8px 6px' }}>이름</th>
                <th style={{ padding: '8px 6px' }}>분류</th>
                <th style={{ padding: '8px 6px' }}>상태</th>
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
                      편집
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item.itemId)}
                      style={{ fontSize: 12, color: '#dc2626', border: '1px solid #fca5a5', background: '#fef2f2' }}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Form */}
        <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
          <h3 style={{ marginTop: 0 }}>{editingItem ? '아이템 편집' : '아이템 추가'}</h3>
          <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: 10 }}>
            {!editingItem && (
              <label style={{ display: 'grid', gap: 4 }}>
                <span>코드 *</span>
                <input
                  value={form.itemCode}
                  onChange={(e) => setForm((f) => ({ ...f, itemCode: e.target.value }))}
                  placeholder="예: MAT-001"
                  required
                />
              </label>
            )}
            <label style={{ display: 'grid', gap: 4 }}>
              <span>이름 *</span>
              <input
                value={form.itemName}
                onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
                required
              />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>분류</span>
              <select
                value={form.resourceCategory}
                onChange={(e) => setForm((f) => ({ ...f, resourceCategory: e.target.value }))}
              >
                {RESOURCE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>상태</span>
              <select
                value={form.itemStatus}
                onChange={(e) => setForm((f) => ({ ...f, itemStatus: e.target.value }))}
              >
                {ITEM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="submit" disabled={isPending}>
                {isPending ? '저장 중…' : editingItem ? '저장' : '추가'}
              </button>
              {editingItem && (
                <button type="button" onClick={resetForm} style={{ background: 'transparent' }}>
                  취소
                </button>
              )}
            </div>
            {(createMutation.isError || updateMutation.isError) && (
              <p style={{ color: '#dc2626', fontSize: 12, margin: 0 }}>저장에 실패했습니다.</p>
            )}
          </form>
        </section>
      </div>
    </div>
  )
}
