import { RibbonButton } from './RibbonButton'
import type { RibbonGroupDefinition } from './types'

interface Props {
  group: RibbonGroupDefinition
}

export function RibbonGroup({ group }: Props) {
  return (
    <div className="ribbon-group">
      {group.content !== undefined ? (
        <div className="ribbon-group__content">{group.content}</div>
      ) : (
        <div className="ribbon-group__buttons">
          {group.buttons.map((button) => (
            <RibbonButton key={button.id} button={button} />
          ))}
        </div>
      )}
      <span className="ribbon-group__label">{group.label}</span>
    </div>
  )
}
