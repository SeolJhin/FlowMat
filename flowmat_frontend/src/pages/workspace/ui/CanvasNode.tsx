import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { Handle, NodeResizer, NodeToolbar, Position, useConnection, useNodeConnections, type NodeProps } from '@xyflow/react'
import type { CanvasNodeViewModel, CanvasPortViewModel } from '../../../entities/workflow/model/types'
import {
  getWorkflowNodeDefinition,
  getWorkflowNodeStyle,
} from '../../../entities/workflow/model/nodeCatalog'
import { useWorkspaceStore } from '../model/workspaceStore'
import { useCanvasInteractionStore } from '../model/canvasInteractionStore'

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
  const connections = useNodeConnections({ handleType: 'target', handleId: port.handleId })
  const isConnecting = connection.inProgress
  const isTargeted =
    isConnecting &&
    connection.toHandle?.nodeId === port.processId &&
    connection.toHandle?.id === port.handleId
  const connCount = connections.length

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
      {connCount > 0 && (
        <span className="canvas-node__port-badge" title={`${connCount}개 연결됨`}>
          {connCount}
        </span>
      )}
    </div>
  )
}

function OutputPortRow({ port, onSelect }: PortRowProps) {
  const connection = useConnection()
  const connections = useNodeConnections({ handleType: 'source', handleId: port.handleId })
  const isSource =
    connection.inProgress &&
    connection.fromNode?.id === port.processId &&
    connection.fromHandle?.id === port.handleId
  const connCount = connections.length

  return (
    <div className="canvas-node__port canvas-node__port--output">
      {connCount > 0 && (
        <span className="canvas-node__port-badge" title={`${connCount}개 연결됨`}>
          {connCount}
        </span>
      )}
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
  const {
    inlineEditingNodeId, selectPort, stopInlineEdit, commitRename,
    activeColorPickerNodeId, openColorPicker, closeColorPicker,
  } = useWorkspaceStore()
  const requestDeleteNode = useCanvasInteractionStore((s) => s.requestDeleteNode)
  const requestColorChange = useCanvasInteractionStore((s) => s.requestColorChange)
  const isColorPickerOpen = activeColorPickerNodeId === node.id
  const editing = inlineEditingNodeId === node.id
  const [draftName, setDraftName] = useState(node.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraftName(node.name) }, [node.name])
  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  const headerColor = resolveColor(node.colorScheme)
  const nodeDefinition = getWorkflowNodeDefinition(node.nodeType)

  return (
    <div
      className={`canvas-node ${selected ? 'canvas-node--selected' : ''} ${editing ? 'canvas-node--editing' : ''}`}
      style={getWorkflowNodeStyle(node.nodeType) as CSSProperties}
    >
      <NodeToolbar isVisible={selected} position={Position.Top} offset={6} align="end">
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', position: 'relative' }}>
          <button
            type="button"
            className="node-toolbar__btn nodrag nopan"
            title="색상 변경"
            onClick={(e) => { e.stopPropagation(); isColorPickerOpen ? closeColorPicker() : openColorPicker(node.id) }}
            style={{ background: resolveColor(node.colorScheme), border: '2px solid white' }}
          />
          {isColorPickerOpen && (
            <div className="color-picker-popup nodrag nopan">
              {Object.entries(COLOR_MAP).map(([scheme, hex]) => (
                <button
                  key={scheme}
                  type="button"
                  className="color-picker-popup__chip"
                  style={{ background: hex, outline: node.colorScheme === scheme ? '2px solid var(--accent)' : 'none' }}
                  title={scheme}
                  onClick={(e) => {
                    e.stopPropagation()
                    closeColorPicker()
                    requestColorChange(node.id, scheme)
                  }}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            className="node-toolbar__btn node-toolbar__btn--delete nodrag nopan"
            title="노드 삭제 (Delete)"
            onClick={(e) => { e.stopPropagation(); requestDeleteNode(node.id) }}
          >
            ×
          </button>
        </div>
      </NodeToolbar>
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
        {editing ? (
          <input
            ref={inputRef}
            className="canvas-node__name-input nodrag"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={() => commitRename(node.id, draftName.trim() || node.name)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename(node.id, draftName.trim() || node.name)
              if (e.key === 'Escape') { setDraftName(node.name); stopInlineEdit() }
            }}
          />
        ) : (
          <span className="canvas-node__name">{node.name}</span>
        )}
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
