import type { AttributeRow } from '../model/setupAttributesModel'
export function SetupAttributeFields({ label, rows, onChange, disabled = false }: {
  label: string; rows: AttributeRow[]; onChange: (rows: AttributeRow[]) => void; disabled?: boolean
}) {
  return <fieldset disabled={disabled} style={{ minWidth: 0, margin: 0, padding: 8 }}>
    <legend>{label}</legend>
    {rows.map((row, index) => <div key={index} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
      <label style={{ minWidth: 0 }}>{label} name {index + 1}<input value={row.name} maxLength={50}
        style={{ width: 130, maxWidth: '100%' }} onChange={(event) => onChange(rows.map((one, i) => i === index ? { ...one, name: event.target.value } : one))} /></label>
      <label style={{ minWidth: 0 }}>{label} value {index + 1}<input value={row.value} maxLength={100}
        style={{ width: 130, maxWidth: '100%' }} onChange={(event) => onChange(rows.map((one, i) => i === index ? { ...one, value: event.target.value } : one))} /></label>
      <button type="button" aria-label={`Remove ${label.toLowerCase()} ${index + 1}`} onClick={() => onChange(rows.filter((_, i) => i !== index))}>Remove</button>
    </div>)}
    <button type="button" disabled={rows.length >= 20} onClick={() => onChange([...rows, { name: '', value: '' }])}>Add {label.toLowerCase()}</button>
  </fieldset>
}
