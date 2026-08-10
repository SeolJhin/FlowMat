import type { RibbonButtonDefinition } from './types'

interface Props {
  button: RibbonButtonDefinition
}

export function RibbonButton({ button }: Props) {
  const { icon: Icon, label, onClick, active, disabled, title } = button

  return (
    <button
      type="button"
      className={`ribbon-button${active ? ' ribbon-button--active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
    >
      <Icon size={18} strokeWidth={1.75} className="ribbon-button__icon" />
      <span className="ribbon-button__label">{label}</span>
    </button>
  )
}
