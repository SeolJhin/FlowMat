import { useCallback, useEffect, useRef, useState, type DragEvent, type MouseEvent } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useViewport,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type OnConnectStart,
  type OnConnectEnd,
  type ReactFlowInstance,
  type Node,
  type Edge,
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
import type { WorkflowPaletteTool } from '../../../entities/workflow/model/nodeCatalog'
import { CanvasNode } from './CanvasNode'
import { CanvasEdge } from './CanvasEdge'
import { useWorkspaceStore } from '../model/workspaceStore'
import { useCanvasInteractionStore } from '../model/canvasInteractionStore'

/** dataTransfer MIME type used by palette drag-to-create. */
export const PALETTE_DRAG_MIME = 'application/flowmat-node-tool'

const nodeTypes = { flowmatNode: CanvasNode }
const edgeTypes = { flowmatEdge: CanvasEdge }

const SNAP_THRESHOLD = 8 // flow-space pixels

interface SnapGuide {
  type: 'vertical' | 'horizontal'
  position: number
  start: number
  end: number
}

function calculateSnapGuides(
  dragging: { x: number; y: number; w: number; h: number },
  others: Array<{ id: string; x: number; y: number; w: number; h: number }>
): SnapGuide[] {
  const dL = dragging.x
  const dC = dragging.x + dragging.w / 2
  const dR = dragging.x + dragging.w
  const dT = dragging.y
  const dM = dragging.y + dragging.h / 2
  const dB = dragging.y + dragging.h

  let bestX: { dist: number; guide: SnapGuide } | null = null
  let bestY: { dist: number; guide: SnapGuide } | null = null

  for (const o of others) {
    const oL = o.x
    const oC = o.x + o.w / 2
    const oR = o.x + o.w
    const oT = o.y
    const oM = o.y + o.h / 2
    const oB = o.y + o.h

    for (const dPt of [dL, dC, dR]) {
      for (const oPt of [oL, oC, oR]) {
        const dist = Math.abs(dPt - oPt)
        if (dist < SNAP_THRESHOLD && (!bestX || dist < bestX.dist)) {
          const allY = [dT, dB, oT, oB]
          bestX = {
            dist,
            guide: { type: 'vertical', position: oPt, start: Math.min(...allY), end: Math.max(...allY) },
          }
        }
      }
    }

    for (const dPt of [dT, dM, dB]) {
      for (const oPt of [oT, oM, oB]) {
        const dist = Math.abs(dPt - oPt)
        if (dist < SNAP_THRESHOLD && (!bestY || dist < bestY.dist)) {
          const allX = [dL, dR, oL, oR]
          bestY = {
            dist,
            guide: { type: 'horizontal', position: oPt, start: Math.min(...allX), end: Math.max(...allX) },
          }
        }
      }
    }
  }

  return [bestX?.guide, bestY?.guide].filter(Boolean) as SnapGuide[]
}

// Renders alignment guide lines in screen space (must be inside ReactFlow for context)
function SnapGuideLayer({ guides }: { guides: SnapGuide[] }) {
  const { x: vpX, y: vpY, zoom } = useViewport()
  if (guides.length === 0) return null

  const toSX = (fx: number) => fx * zoom + vpX
  const toSY = (fy: number) => fy * zoom + vpY

  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
        overflow: 'visible',
      }}
    >
      {guides.map((guide, i) =>
        guide.type === 'vertical' ? (
          <line
            key={i}
            x1={toSX(guide.position)}
            y1={toSY(guide.start - 20)}
            x2={toSX(guide.position)}
            y2={toSY(guide.end + 20)}
            stroke="var(--accent)"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.85}
          />
        ) : (
          <line
            key={i}
            x1={toSX(guide.start - 20)}
            y1={toSY(guide.position)}
            x2={toSX(guide.end + 20)}
            y2={toSY(guide.position)}
            stroke="var(--accent)"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.85}
          />
        )
      )}
    </svg>
  )
}

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
  onNodeDrop(tool: WorkflowPaletteTool, position: { x: number; y: number }): void
  onConnectDropOnCanvas(payload: {
    fromProcessId: string
    fromHandleId: string | null
    fromHandleType: 'source' | 'target'
    flowPosition: { x: number; y: number }
    screenPosition: { x: number; y: number }
  }): void
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
  onNodeDrop,
  onConnectDropOnCanvas,
}: Props) {
  const { selectNode, selectEdge } = useWorkspaceStore()
  const setHoveredEdgeId = useCanvasInteractionStore((s) => s.setHoveredEdgeId)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([])

  const [localNodes, setLocalNodes] = useState<RfNode[]>(() => toRfNodes(nodes, selectedNodeId))
  const [localEdges, setLocalEdges] = useState<RfEdge[]>(() => toRfEdges(edges, selectedEdgeId))

  // Keep a ref so snap calculation always reads the latest positions without deps churn
  const localNodesRef = useRef<RfNode[]>(localNodes)

  useEffect(() => {
    setLocalNodes((prev) => {
      const next = toRfNodes(nodes, selectedNodeId)
      const updated = next.map((n) => {
        const existing = prev.find((p) => p.id === n.id)
        if (existing && (existing.width !== n.width || existing.height !== n.height)) {
          return { ...n, width: existing.width, height: existing.height }
        }
        return n
      })
      localNodesRef.current = updated
      return updated
    })
  }, [nodes, selectedNodeId])

  useEffect(() => {
    setLocalEdges(toRfEdges(edges, selectedEdgeId))
  }, [edges, selectedEdgeId])

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setLocalNodes((nds) => {
        const updated = applyNodeChanges(changes, nds) as RfNode[]
        localNodesRef.current = updated
        return updated
      })

      for (const change of changes) {
        if (change.type === 'position' && change.dragging === false && change.position) {
          onNodeDragEnd(change.id, change.position.x, change.position.y)
        }
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

  const handleNodeDrag = useCallback((_event: MouseEvent, node: Node) => {
    const current = localNodesRef.current
    const dragging = current.find((n) => n.id === node.id)
    if (!dragging) return

    const others = current
      .filter((n) => n.id !== node.id)
      .map((n) => ({ id: n.id, x: n.position.x, y: n.position.y, w: n.width, h: n.height }))

    setSnapGuides(
      calculateSnapGuides(
        { x: node.position.x, y: node.position.y, w: dragging.width, h: dragging.height },
        others
      )
    )
  }, [])

  const handleNodeDragStop = useCallback(() => {
    setSnapGuides([])
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

  // Connection drag dropped on empty canvas → open the on-canvas node picker
  // (ported from tldraw's OnCanvasComponentPicker flow).
  const handleConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      if (connectionState.isValid) return
      const fromNode = connectionState.fromNode
      const fromHandle = connectionState.fromHandle
      if (!fromNode || !fromHandle || !reactFlowInstance) return

      const client =
        'clientX' in event
          ? { x: event.clientX, y: event.clientY }
          : { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }

      onConnectDropOnCanvas({
        fromProcessId: fromNode.id,
        fromHandleId: fromHandle.id ?? null,
        fromHandleType: fromHandle.type,
        flowPosition: reactFlowInstance.screenToFlowPosition(client),
        screenPosition: client,
      })
    },
    [onConnectDropOnCanvas, reactFlowInstance]
  )

  // Palette drag-to-create (ported from tldraw's useDragToCreate).
  const handleDragOver = useCallback((event: DragEvent) => {
    if (!event.dataTransfer.types.includes(PALETTE_DRAG_MIME)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent) => {
      const tool = event.dataTransfer.getData(PALETTE_DRAG_MIME)
      if (!tool || !reactFlowInstance) return
      event.preventDefault()

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      onNodeDrop(tool as WorkflowPaletteTool, position)
    },
    [onNodeDrop, reactFlowInstance]
  )

  const handleEdgeMouseEnter = useCallback(
    (_event: MouseEvent, edge: Edge) => setHoveredEdgeId(edge.id),
    [setHoveredEdgeId]
  )

  const handleEdgeMouseLeave = useCallback(
    () => setHoveredEdgeId(null),
    [setHoveredEdgeId]
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
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onConnectStart={handleConnectStart}
        onConnect={handleConnect}
        onConnectEnd={handleConnectEnd}
        onPaneClick={handlePaneClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onEdgeMouseEnter={handleEdgeMouseEnter}
        onEdgeMouseLeave={handleEdgeMouseLeave}
        fitView
        minZoom={0.1}
        maxZoom={2.5}
        snapToGrid
        snapGrid={[8, 8]}
        deleteKeyCode={null}
      >
        <SnapGuideLayer guides={snapGuides} />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
        <Controls />
        <MiniMap zoomable pannable nodeStrokeWidth={2} />
      </ReactFlow>
    </div>
  )
}
