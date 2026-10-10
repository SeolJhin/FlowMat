/**
 * The calendar day a view of approved BOMs uses (docs/domain/multi-level-bom.md M7): blank is the project's today, the
 * same as the server's default.
 */
export function AsOfInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12, margin: '6px 0' }}>
      As of
      <input type="date" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
      <span className="inspector-hint">{value ? 'revisions effective that day' : "blank: the project's today"}</span>
    </label>
  )
}
