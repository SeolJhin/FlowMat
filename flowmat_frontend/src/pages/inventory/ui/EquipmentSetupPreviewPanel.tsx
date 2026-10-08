import { useState } from 'react'
import { useItemsQuery } from '../../../entities/catalog/api/useItemsQuery'
import { useEquipmentSetupPreview, type SetupRuleType } from '../../../entities/catalog/api/useEquipmentSetupPreview'
import { errorMessage } from '../../../shared/lib/errorMessage'
const labels: Record<SetupRuleType, string> = {
  NONE: 'No applicable rule', EXACT_ITEM_PAIR: 'Exact item pair', ATTRIBUTE_RULE: 'Setup attribute rule',
  FROM_ITEM: 'From item to any', TO_ITEM: 'Any to item', DEFAULT: 'Default rule',
}
export function EquipmentSetupPreviewPanel({ equipmentId, projectId }: { equipmentId: string; projectId: string }) {
  const items = useItemsQuery(projectId)
  const [from, setFrom] = useState(''), [to, setTo] = useState('')
  // A refreshed item list can remove a selection. Do not show its old cached preview behind an empty select.
  const fromAvailable = !items.isError && Boolean(items.data?.some((item) => item.itemId === from))
  const toAvailable = !items.isError && Boolean(items.data?.some((item) => item.itemId === to))
  const preview = useEquipmentSetupPreview(equipmentId, fromAvailable ? from : '', toAvailable ? to : '')
  const selected = fromAvailable && toAvailable
  return <section aria-label="Saved setup preview" style={{ marginTop: 16, display: 'grid', gap: 8 }}>
    <strong>Saved setup preview</strong>
    <p className="inspector-hint" style={{ margin: 0 }}>Check which saved rule applies to a pair of items. Unsaved attribute and rule edits are excluded; preview does not change a plan.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {([['From item for preview', from, setFrom], ['To item for preview', to, setTo]] as const).map(([label, value, onChange]) =>
        <label key={label} style={{ minWidth: 0, flex: '1 1 160px' }}>{label}
          <select value={value} disabled={items.isPending || items.isError} style={{ width: '100%', minWidth: 0 }}
            onChange={(event) => onChange(event.target.value)}>
            <option value="">Choose item</option>
            {(items.data ?? []).map((item) => <option key={item.itemId} value={item.itemId}>{item.itemCode} · {item.itemName}</option>)}
          </select>
        </label>)}
      <button type="button" disabled={!selected || preview.isFetching} onClick={() => void preview.refetch()}>Reload saved preview</button>
    </div>
    {selected && preview.isFetching && <p role="status" style={{ margin: 0 }}>Loading saved setup preview...</p>}
    {selected && preview.data && !preview.isError && !preview.isFetching && <p role="status" style={{ margin: 0 }}>
      {labels[preview.data.ruleType]}: {preview.data.minutes} min
    </p>}
    {(items.isError || (selected && preview.isError)) && <p role="alert" style={{ margin: 0 }}>{errorMessage(items.error ?? preview.error)}</p>}
  </section>
}
