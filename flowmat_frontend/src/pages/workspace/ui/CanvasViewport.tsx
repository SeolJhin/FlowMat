import { useCallback, useState, type MouseEvent } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type OnConnectStart,
  type ReactFlowInstance,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type {
  CanvasNodeViewModel,
  CanvasEdgeViewModel,
  CanvasMode,
  ConnectStartPayload,
  ConnectCompletePayload,
} from '../../../entities/workflow/model/types'
import { CanvasNode } from './CanvasNode'
import { CanvasEdge } from './CanvasEdge'
import { useWorkspaceStore } from '../model/workspaceStore'

const nodeTypes = { flowmatNode: CanvasNode }
const edgeTypes = { flowmatEdge: CanvasEdge }

interface Props {
  nodes: CanvasNodeViewModel[]
  edges: CanvasEdgeViewModel[]
  selectedNodeId: string | null
  selectedEdgeId: string | null
  canvasMode: CanvasMode
  drawingEnabled: boolean
  onNodeSelect(id: string): void
  onEdgeSelect(id: string): void
  onNodeDragEnd(processId: string, x: number, y: number): void
  onConnectStart(payload: ConnectStartPayload): void
  onConnectComplete(payload: ConnectCompletePayload): void
  onCanvasClick(position: { x: number; y: number }): void
}

// Convert view models to React Flow node/edge objects
function toRfNodes(nodes: CanvasNodeViewModel[], selectedId: string | null) {
  return nodes.map((n) => ({
    id: n.id,
    type: 'flowmatNode' as const,
    position: n.position,
    selected: n.id === selectedId,
    data: n,
  }))
}

function toRfEdges(edges: CanvasEdgeViewModel[], selectedId: string | null) {
  return edges.map((e) => ({
    id: e.id,
    type: 'flowmatEdge' as const,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    selected: e.id === selectedId,
    data: e,
  }))
}

export function CanvasViewport({
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  drawingEnabled,
  onNodeSelect,
  onEdgeSelect,
  onNodeDragEnd,
  onConnectStart,
  onConnectComplete,
  onCanvasClick,
}: Props) {
  const { selectNode, selectEdge } = useWorkspaceStore()
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)

  const rfNodes = toRfNodes(nodes, selectedNodeId)
  const rfEdges = toRfEdges(edges, selectedEdgeId)

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Only handle position changes here (read-only state reconciliation)
      for (const change of changes) {
        if (change.type === 'position' && change.dragging === false && change.position) {
          onNodeDragEnd(change.id, change.position.x, change.position.y)
        }
      }
      // We don't maintain local RF state; parent owns the source of truth
      applyNodeChanges(changes, rfNodes)
    },
    [rfNodes, onNodeDragEnd]
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      applyEdgeChanges(changes, rfEdges)
    },
    [rfEdges]
  )

  const handleConnectStart: OnConnectStart = useCallback(
    (_event, { nodeId, handleId }) => {
      if (nodeId && handleId) {
        onConnectStart({ processId: nodeId, ioId: handleId, handleId })
      }
    },
    [onConnectStart]
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return
      onConnectComplete({
        fromProcessId: connection.source,
        toProcessId: connection.target,
        fromIoId: connection.sourceHandle ?? null,
        toIoId: connection.targetHandle ?? null,
        sourceHandle: connection.sourceHandle ?? 'out-default',
        targetHandle: connection.targetHandle ?? 'in-default',
      })
    },
    [onConnectComplete]
  )

  const handlePaneClick = useCallback(
    (event: MouseEvent) => {
      if (!reactFlowInstance) return

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      onCanvasClick(position)
    },
    [onCanvasClick, reactFlowInstance]
  )

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        cursor: drawingEnabled ? 'crosshair' : 'default',
      }}
    >
      <ReactFlow
        onInit={setReactFlowInstance}
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeClick={(_e, node) => {
          selectNode(node.id)
          onNodeSelect(node.id)
        }}
        onEdgeClick={(_e, edge) => {
          selectEdge(edge.id)
          onEdgeSelect(edge.id)
        }}
        onConnectStart={handleConnectStart}
        onConnect={handleConnect}
        onPaneClick={handlePaneClick}
        fitView
      >
        <Background gap={16} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  )
}
