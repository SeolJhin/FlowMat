import { useEffect } from 'react'
import type { WorkflowNodeDefinition, WorkflowPaletteTool } from '../../../entities/workflow/model/nodeCatalog'
import type { NodePickerState } from '../model/canvasInteractionStore'

interface Props {
  picker: NodePickerState
  definitions: WorkflowNodeDefinition[]
  onPick(tool: WorkflowPaletteTool): void
  onClose(): void
}

/**
 * On-canvas node type picker (ported from tldraw's OnCanvasComponentPicker).
 *
 * Shown when a connection drag is dropped on empty canvas, or when the "+"
 * handle at the center of an edge is clicked. Picking a type creates the
 * node at the recorded flow position and wires the connection(s).
 */
export function NodePickerPopup({ picker, definitions, onPick, onClose }: Props) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [onClose])

  return (
    <>
      <div className="node-picker__backdrop" onClick={onClose} />
      <div
        className="node-picker"
        style={{ left: picker.screenPosition.x, top: picker.screenPosition.y }}
      >
        <div className="node-picker__title">
          {picker.kind === 'insert-on-edge' ? 'Insert node' : 'Create node'}
        </div>
        {definitions.map((definition) => (
          <button
            key={definition.tool}
            type="button"
            className="node-picker__item"
            onClick={() => onPick(definition.tool)}
          >
            <span className={`node-picker__chip node-picker__chip--${definition.colorScheme}`} />
            <span className="node-picker__label">{definition.label}</span>
            <span className="node-picker__desc">{definition.description}</span>
          </button>
        ))}
      </div>
    </>
  )
}
