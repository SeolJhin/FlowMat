import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { CanvasNodeViewModel, CanvasPortViewModel } from '../../../entities/workflow/model/types'
import { useWorkspaceStore } from '../model/workspaceStore'

// Color scheme → CSS color approximation
const COLOR_MAP: Record<string, string> = {
  sky: '#0ea5e9',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  slate: '#64748b',
  gray: '#6b7280',
}

function resolveColor(scheme: string): string {
  return COLOR_MAP[scheme] ?? scheme
}

interface PortRowProps {
  port: CanvasPortViewModel
  onSelect(processIoId: string): void
}

function InputPortRow({ port, onSelect }: PortRowProps) {
  return (
    <div className="canvas-node__port canvas-node__port--input">
      <Handle
        type="target"
        position={Position.Left}
        id={port.handleId}
        style={{ background: resolveColor(port.colorScheme) }}
        onClick={() => onSelect(port.processIoId)}
      />
      <span className="canvas-node__port-name">{port.name}</span>
    </div>
  )
}

function OutputPortRow({ port, onSelect }: PortRowProps) {
  return (
    <div className="canvas-node__port canvas-node__port--output">
      <span className="canvas-node__port-name">{port.name}</span>
      <Handle
        type="source"
        position={Position.Right}
        id={port.handleId}
        style={{ background: resolveColor(port.colorScheme) }}
        onClick={() => onSelect(port.processIoId)}
      />
    </div>
  )
}

interface CanvasNodeComponentProps extends NodeProps {
  data: CanvasNodeViewModel
}

export function CanvasNode({ data: node, selected }: CanvasNodeComponentProps) {
  const { inlineEditingNodeId, selectPort } = useWorkspaceStore()
  const editing = inlineEditingNodeId === node.id

  const headerColor = resolveColor(node.colorScheme)

  return (
    <div
      className={`canvas-node ${selected ? 'canvas-node--selected' : ''} ${editing ? 'canvas-node--editing' : ''}`}
      style={{ minWidth: node.size.width, minHeight: node.size.height }}
    >
      <div className="canvas-node__header" style={{ borderTopColor: headerColor }}>
        <span
          className="canvas-node__color-chip"
          style={{ background: headerColor }}
          title={node.colorScheme}
        />
        <span className="canvas-node__name">{node.name}</span>
        <span className="canvas-node__type">{node.nodeType}</span>
      </div>

      {node.inputs.length > 0 && (
        <div className="canvas-node__section">
          {node.inputs.map((port) => (
            <InputPortRow key={port.id} port={port} onSelect={selectPort} />
          ))}
        </div>
      )}

      {node.outputs.length > 0 && (
        <div className="canvas-node__section">
          {node.outputs.map((port) => (
            <OutputPortRow key={port.id} port={port} onSelect={selectPort} />
          ))}
        </div>
      )}

      {/* Default handles when no I/O rows exist */}
      {node.inputs.length === 0 && (
        <Handle type="target" position={Position.Left} id="in-default" />
      )}
      {node.outputs.length === 0 && (
        <Handle type="source" position={Position.Right} id="out-default" />
      )}
    </div>
  )
}
