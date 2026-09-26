import { ITEM_INFO_LABELS, type ItemInfoForm } from '../model/itemInfoModel'

const MAX: Record<keyof ItemInfoForm, number> = { itemGroup: 50, spec: 200, barcode: 100, sku: 100, storageCondition: 100, description: 2000 }

/**
 * The item's descriptive fields (docs/domain/item-details.md), folded away unless the item has some. Saving sends them
 * all, so emptying a field clears it.
 */
export function ItemInfoFields({ value, onChange }: { value: ItemInfoForm; onChange: (value: ItemInfoForm) => void }) {
  const filled = ITEM_INFO_LABELS.filter(([key]) => value[key].trim()).length
  return (
    <details open={filled > 0} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }}>
      <summary style={{ cursor: 'pointer', fontSize: 13 }}>More details{filled > 0 ? ` (${filled})` : ''}</summary>
      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
        {ITEM_INFO_LABELS.map(([key, label]) => (
          <label key={key} style={{ display: 'grid', gap: 4 }}>
            <span>{label}</span>
            {key === 'description' ? (
              <textarea rows={3} maxLength={MAX[key]} value={value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.value })} />
            ) : (
              <input maxLength={MAX[key]} value={value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.value })} />
            )}
          </label>
        ))}
      </div>
    </details>
  )
}
