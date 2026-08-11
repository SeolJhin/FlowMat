interface Props {
  id: string
  label: string
  active: boolean
  onSelect: (id: string) => void
}

export function RibbonTab({ id, label, active, onSelect }: Props) {
  return (
    <button
      type="button"
      className={`ribbon-tab${active ? ' ribbon-tab--active' : ''}`}
      onClick={() => onSelect(id)}
      aria-selected={active}
      role="tab"
    >
      {label}
    </button>
  )
}
