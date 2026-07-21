import type { CSSProperties } from 'react'
import { Handle, NodeResizer, Position, useConnection, type NodeProps } from '@xyflow/react'
import type { CanvasNodeViewModel, CanvasPortViewModel } from '../../../entities/workflow/model/types'
import {
  getWorkflowNodeDefinition,
  getWorkflowNodeStyle,
} from '../../../entities/workflow/model/nodeCatalog'
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
  const connection = useConnection()
  const isConnecting = connection.inProgress
  const isTargeted =
    isConnecting &&
    connection.toHandle?.nodeId === port.processId &&
    connection.toHandle?.id === port.handleId

  return (
    <div className="canvas-node__port canvas-node__port--input">
      <Handle
        type="target"
        position={Position.Left}
        id={port.handleId}
        style={{
          background: isTargeted ? '#22c55e' : resolveColor(port.colorScheme),
          boxShadow: isTargeted ? '0 0 0 3px #bbf7d0' : undefined,
          transition: 'background 0.15s, box-shadow 0.15s',
        }}
        onClick={() => onSelect(port.processIoId)}
      />
      <span className="canvas-node__port-name">{port.name}</span>
    </div>
  )
}

function OutputPortRow({ port, onSelect }: PortRowProps) {
  const connection = useConnection()
  const isSource =
    connection.inProgress &&
    connection.fromNode?.id === port.processId &&
    connection.fromHandle?.id === port.handleId

  return (
    <div className="canvas-node__port canvas-node__port--output">
      <span className="canvas-node__port-name">{port.name}</span>
      <Handle
        type="source"
        position={Position.Right}
        id={port.handleId}
        style={{
          background: isSource ? '#6366f1' : resolveColor(port.colorScheme),
          boxShadow: isSource ? '0 0 0 3px #c7d2fe' : undefined,
          transition: 'background 0.15s, box-shadow 0.15s',
        }}
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
  const nodeDefinition = getWorkflowNodeDefinition(node.nodeType)

  return (
    <div
      className={`canvas-node ${selected ? 'canvas-node--selected' : ''} ${editing ? 'canvas-node--editing' : ''}`}
      style={getWorkflowNodeStyle(node.nodeType) as CSSProperties}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={120}
        minHeight={60}
        lineStyle={{ borderColor: 'var(--accent)', borderWidth: 1 }}
        handleStyle={{
          width: 8,
          height: 8,
          borderRadius: 2,
          background: 'white',
          border: '1.5px solid var(--accent)',
        }}
      />
      <div className="canvas-node__header" style={{ borderTopColor: headerColor }}>
        <span
          className="canvas-node__color-chip"
          style={{ background: headerColor }}
          title={node.colorScheme}
        />
        <span className="canvas-node__name">{node.name}</span>
        <span className="canvas-node__type">{nodeDefinition.label}</span>
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
