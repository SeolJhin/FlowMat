import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
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
  onNodeResize(processId: string, width: number, height: number): void
  onConnectStart(payload: ConnectStartPayload): void
  onConnectComplete(payload: ConnectCompletePayload): void
  onCanvasClick(position: { x: number; y: number }): void
}

type RfNode = {
  id: string
  type: 'flowmatNode'
  position: { x: number; y: number }
  width: number
  height: number
  selected: boolean
  data: CanvasNodeViewModel
}

type RfEdge = {
  id: string
  type: 'flowmatEdge'
  source: string
  target: string
  sourceHandle: string | null
  targetHandle: string | null
  selected: boolean
  data: CanvasEdgeViewModel
}

function toRfNodes(nodes: CanvasNodeViewModel[], selectedId: string | null): RfNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: 'flowmatNode' as const,
    position: n.position,
    width: n.size.width,
    height: n.size.height,
    selected: n.id === selectedId,
    data: n,
  }))
}

function toRfEdges(edges: CanvasEdgeViewModel[], selectedId: string | null): RfEdge[] {
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
  onNodeResize,
  onConnectStart,
  onConnectComplete,
  onCanvasClick,
}: Props) {
  const { selectNode, selectEdge } = useWorkspaceStore()
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)

  // Local RF state — React Flow owns positions/dimensions between server syncs
  const [localNodes, setLocalNodes] = useState<RfNode[]>(() => toRfNodes(nodes, selectedNodeId))
  const [localEdges, setLocalEdges] = useState<RfEdge[]>(() => toRfEdges(edges, selectedEdgeId))

  // Sync from server after mutations + refetch
  useEffect(() => {
    setLocalNodes((prev) => {
      const next = toRfNodes(nodes, selectedNodeId)
      return next.map((n) => {
        const existing = prev.find((p) => p.id === n.id)
        // Preserve RF-managed dimensions while a resize hasn't been acknowledged yet
        if (existing && (existing.width !== n.width || existing.height !== n.height)) {
          return { ...n, width: existing.width, height: existing.height }
        }
        return n
      })
    })
  }, [nodes, selectedNodeId])

  useEffect(() => {
    setLocalEdges(toRfEdges(edges, selectedEdgeId))
  }, [edges, selectedEdgeId])

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setLocalNodes((nds) => applyNodeChanges(changes, nds) as RfNode[])

      for (const change of changes) {
        if (change.type === 'position' && change.dragging === false && change.position) {
          onNodeDragEnd(change.id, change.position.x, change.position.y)
        }
        // NodeResizer fires 'dimensions' changes; save to server when drag is complete
        if (change.type === 'dimensions' && change.resizing === false && change.dimensions) {
          onNodeResize(change.id, change.dimensions.width, change.dimensions.height)
        }
      }
    },
    [onNodeDragEnd, onNodeResize]
  )

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    setLocalEdges((eds) => applyEdgeChanges(changes, eds) as RfEdge[])
  }, [])

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
    <div style={{ width: '100%', height: '100%', cursor: drawingEnabled ? 'crosshair' : 'default' }}>
      <ReactFlow
        onInit={setReactFlowInstance}
        nodes={localNodes}
        edges={localEdges}
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
        minZoom={0.1}
        maxZoom={2.5}
        deleteKeyCode={null}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
        <Controls />
        <MiniMap zoomable pannable nodeStrokeWidth={2} />
      </ReactFlow>
    </div>
  )
}
