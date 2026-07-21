import { useEffect, useRef, useState } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import type {
  ConnectCompletePayload,
  ConnectStartPayload,
  WorkflowCanvasViewModel,
} from '../../../entities/workflow/model/types'
import { useWorkspaceStore } from '../model/workspaceStore'
import { useWorkflowCanvasActions } from '../model/useWorkflowCanvasActions'
import { useCanvasInteractionStore } from '../model/canvasInteractionStore'
import { getRelatedConnectionIds } from '../../../entities/workflow/model/connectionPolicy'
import { useAutoLayout } from '../model/useAutoLayout'
import { CANVAS_ACTIONS } from '../model/canvasActions'
import { useWorkflowsQuery } from '../../../entities/workflow/api/useWorkflowsQuery'
import { useNavigate } from 'react-router-dom'
import { CanvasViewport, PALETTE_DRAG_MIME } from './CanvasViewport'
import { ConnectionInspector } from './ConnectionInspector'
import { NodeInspector } from './NodeInspector'
import { NodePickerPopup } from './NodePickerPopup'

interface Props {
  canvas: WorkflowCanvasViewModel
}

export function WorkflowCanvasPage({ canvas }: Props) {
  const {
    selectedProcessId,
    selectedConnectionId,
    selectedPortId,
    inspectorMode,
    canvasMode,
    selectNode,
    selectEdge,
    clearSelection,
    setConnectionDraft,
    pendingRename,
    clearPendingRename,
    inlineEditingEdgeId,
    stopInlineEditEdge,
    panelWidths,
  } = useWorkspaceStore()

  const panelWidthRef = useRef(panelWidths)
  panelWidthRef.current = panelWidths
  const [localPanelWidths, setLocalPanelWidths] = useState(panelWidths)

  function makeResizeHandler(side: 'left' | 'right') {
    return (e: React.MouseEvent) => {
      e.preventDefault()
      const startX = e.clientX
      const startWidth = side === 'left' ? localPanelWidths.left : localPanelWidths.right
      function onMove(ev: MouseEvent) {
        const delta = side === 'left' ? ev.clientX - startX : startX - ev.clientX
        const next = Math.max(160, Math.min(400, startWidth + delta))
        setLocalPanelWidths((w) => ({ ...w, [side]: next }))
      }
      function onUp() {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }
  }

  const {
    activeTool,
    setActiveTool,
    workspaceMessage,
    paletteDefinitions,
    commandHistory,
    addNode,
    createNodeAt,
    createNodeFromTool,
    createNodeFromConnectionDrop,
    insertNodeOnEdge,
    updateNode,
    createPort,
    updatePort,
    deletePort,
    saveNodePosition,
    batchUpdateNodePositions,
    updateConnection,
    deleteConnection,
    deleteNode,
    createConnection,
  } = useWorkflowCanvasActions({ canvas, clearSelection })

  const navigate = useNavigate()
  const workflowsQuery = useWorkflowsQuery(canvas.workflow.projectId)
  const workflows = workflowsQuery.data ?? []
  const isMutating = useIsMutating()
  const [savedLabel, setSavedLabel] = useState<'saving' | 'saved' | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isMutating > 0) {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      setSavedLabel('saving')
    } else if (savedLabel === 'saving') {
      setSavedLabel('saved')
      savedTimerRef.current = setTimeout(() => setSavedLabel(null), 2000)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMutating])

  const { applyLayout } = useAutoLayout({
    nodes: canvas.nodes,
    edges: canvas.edges,
    onBatchUpdate: batchUpdateNodePositions,
    onFitView: () => fitViewRef.current(),
  })

  const nodePicker = useCanvasInteractionStore((s) => s.nodePicker)
  const openNodePicker = useCanvasInteractionStore((s) => s.openNodePicker)
  const closeNodePicker = useCanvasInteractionStore((s) => s.closeNodePicker)
  const pendingDeleteNodeId = useCanvasInteractionStore((s) => s.pendingDeleteNodeId)
  const pendingDeleteEdgeId = useCanvasInteractionStore((s) => s.pendingDeleteEdgeId)
  const clearDeleteRequest = useCanvasInteractionStore((s) => s.clearDeleteRequest)
  const pendingColorChange = useCanvasInteractionStore((s) => s.pendingColorChange)
  const clearColorChange = useCanvasInteractionStore((s) => s.clearColorChange)

  const { past, future, undo, redo } = commandHistory

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isEditing =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      const ctx = {
        selectedProcessId,
        selectedConnectionId,
        isEditing,
        deleteNodeWithConfirm,
        deleteConnection,
        clearSelection,
        undo,
        redo,
      }

      for (const action of CANVAS_ACTIONS) {
        if (action.keyTest(e) && action.predicate(ctx)) {
          e.preventDefault()
          void action.handler(ctx)
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, selectedProcessId, selectedConnectionId, deleteNodeWithConfirm, deleteConnection, clearSelection])

  // Ref to avoid stale closure in the effect below
  const canvasRef = useRef(canvas)
  canvasRef.current = canvas
  const fitViewRef = useRef<() => void>(() => {})
  const exportPngRef = useRef<(filename: string) => void>(() => {})

  useEffect(() => {
    if (pendingDeleteNodeId) {
      clearDeleteRequest()
      void deleteNodeWithConfirm(pendingDeleteNodeId)
    }
  // deleteNodeWithConfirm captures canvas via canvasRef so no dep needed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDeleteNodeId, clearDeleteRequest])

  useEffect(() => {
    if (pendingDeleteEdgeId) {
      clearDeleteRequest()
      void deleteConnection(pendingDeleteEdgeId)
    }
  }, [pendingDeleteEdgeId, clearDeleteRequest, deleteConnection])

  useEffect(() => {
    if (pendingColorChange) {
      clearColorChange()
      void updateNode({ processId: pendingColorChange.nodeId, colorScheme: pendingColorChange.colorScheme })
    }
  }, [pendingColorChange, clearColorChange, updateNode])

  useEffect(() => {
    if (pendingRename) {
      clearPendingRename()
      void updateNode({ processId: pendingRename.nodeId, processName: pendingRename.name })
    }
  }, [pendingRename, clearPendingRename, updateNode])

  const selectedNode = selectedProcessId ? canvas.nodeMap[selectedProcessId] ?? null : null
  const selectedEdge = selectedConnectionId
    ? canvas.edges.find((edge) => edge.id === selectedConnectionId) ?? null
    : null
  const selectedPort = selectedPortId ? canvas.portMap[selectedPortId] ?? null : null

  function exportJson() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      workflow: { id: canvas.workflow.workflowId, name: canvas.workflow.workflowName },
      nodes: canvas.nodes.map((n) => ({
        id: n.id,
        name: n.name,
        nodeType: n.nodeType,
        processType: n.processType,
        colorScheme: n.colorScheme,
        posX: Math.round(n.position.x),
        posY: Math.round(n.position.y),
        width: n.size.width,
        height: n.size.height,
        description: n.description,
        inputs: n.inputs.map((p) => ({ name: p.name, ioType: p.ioType, direction: p.direction, quantity: p.quantity, unit: p.unit, colorScheme: p.colorScheme })),
        outputs: n.outputs.map((p) => ({ name: p.name, ioType: p.ioType, direction: p.direction, quantity: p.quantity, unit: p.unit, colorScheme: p.colorScheme })),
      })),
      edges: canvas.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        connectionType: e.connectionType,
        label: e.label,
        flowRate: e.flowRate,
        unit: e.unit,
        delayTimeSec: e.delayTimeSec,
        lossRate: e.lossRate,
        priority: e.priority,
      })),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${canvas.workflow.workflowName}.flowmat.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function deleteNodeWithConfirm(processId: string) {
    const relatedCount = getRelatedConnectionIds(canvas.edges, processId).length
    if (
      relatedCount === 0 ||
      window.confirm(
        `이 노드를 삭제하면 연결된 연결선 ${relatedCount}개도 함께 삭제됩니다. 계속하시겠습니까?`
      )
    ) {
      await deleteNode(processId)
    }
  }

  async function handleNodeDragEnd(processId: string, x: number, y: number) {
    await saveNodePosition(processId, x, y)
  }

  async function handleNodeResize(processId: string, width: number, height: number) {
    await updateNode({ processId, width: Math.round(width), height: Math.round(height) })
  }

  function handleConnectStart(payload: ConnectStartPayload) {
    setConnectionDraft({
      fromProcessId: payload.processId,
      fromIoId: payload.ioId,
      sourceHandle: payload.handleId,
    })
  }

  async function handleConnectComplete(payload: ConnectCompletePayload) {
    setConnectionDraft(null)
    await createConnection(payload)
  }

  async function handleNodePick(tool: Parameters<typeof createNodeFromTool>[0]) {
    if (!nodePicker) return
    closeNodePicker()
    if (nodePicker.kind === 'connect-drop') {
      await createNodeFromConnectionDrop(nodePicker.draft, tool, nodePicker.flowPosition)
    } else {
      await insertNodeOnEdge(nodePicker.edgeId, tool, nodePicker.flowPosition)
    }
  }

  return (
    <div className="workspace-layout">
      <header className="workspace-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'grid', gap: '4px' }}>
            <span className="workspace-topbar__project">{canvas.workflow.workflowName}</span>
            <span className="workspace-topbar__status">
              {canvas.workflow.workflowStatus} | {canvas.workflow.workflowType}
            </span>
          </div>
          {workflows.length > 1 && (
            <select
              className="workflow-switcher"
              value={canvas.workflow.workflowId}
              onChange={(e) => {
                navigate(`/projects/${canvas.workflow.projectId}/workflows/${e.target.value}`)
              }}
              title="워크플로우 전환"
            >
              {workflows.map((wf) => (
                <option key={wf.workflowId} value={wf.workflowId}>
                  {wf.workflowName}
                </option>
              ))}
            </select>
          )}
        </div>
        {savedLabel && (
          <span className={`save-status save-status--${savedLabel}`}>
            {savedLabel === 'saving' ? 'Saving…' : 'Saved ✓'}
          </span>
        )}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['select', ...paletteDefinitions.map((definition) => definition.tool)] as const).map(
              (tool) => (
                <button
                  key={tool}
                  type="button"
                  onClick={() => setActiveTool(tool)}
                  style={{
                    border:
                      activeTool === tool ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: activeTool === tool ? 'var(--accent-bg)' : 'transparent',
                  }}
                >
                  {tool === 'select' ? 'Pointer' : tool}
                </button>
              )
            )}
          </div>
          <button
            type="button"
            onClick={() => void undo()}
            disabled={past.length === 0}
            title={past.length > 0 ? `Undo: ${past[past.length - 1].label}` : 'Nothing to undo'}
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => void redo()}
            disabled={future.length === 0}
            title={future.length > 0 ? `Redo: ${future[0].label}` : 'Nothing to redo'}
          >
            Redo
          </button>
          <button
            type="button"
            onClick={() => void applyLayout('TB')}
            disabled={canvas.nodes.length === 0}
            title="세로 자동 정렬 (Top → Bottom)"
          >
            Layout ↓
          </button>
          <button
            type="button"
            onClick={() => void applyLayout('LR')}
            disabled={canvas.nodes.length === 0}
            title="가로 자동 정렬 (Left → Right)"
          >
            Layout →
          </button>
          <button
            type="button"
            onClick={exportJson}
            disabled={canvas.nodes.length === 0}
            title="JSON으로 내보내기 (백업/공유)"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => exportPngRef.current(canvas.workflow.workflowName)}
            disabled={canvas.nodes.length === 0}
            title="PNG로 내보내기"
          >
            Export PNG
          </button>
          <button type="button" onClick={() => void addNode()}>
            Add Node
          </button>
          <span style={{ fontSize: '13px', opacity: 0.8 }}>
            Current tool:{' '}
            {activeTool === 'select'
              ? 'pointer'
              : paletteDefinitions.find((definition) => definition.tool === activeTool)?.label}
            . Click the canvas to place a node, then drag between handles to connect.
          </span>
        </div>
      </header>

      {workspaceMessage && (
        <div
          style={{
            margin: '12px 16px 0',
            padding: '10px 12px',
            border: '1px solid #fca5a5',
            borderRadius: '10px',
            color: '#991b1b',
            background: '#fef2f2',
          }}
        >
          {workspaceMessage}
        </div>
      )}

      <div className="workspace-body">
        <aside className="workspace-panel workspace-panel--left" style={{ width: localPanelWidths.left }}>
          <div style={{ display: 'grid', gap: '10px' }}>
            <h3 style={{ margin: 0 }}>Node Palette</h3>
            <p className="panel-placeholder" style={{ margin: 0 }}>
              Pick a workflow node, then click any empty canvas area.
            </p>
            {paletteDefinitions.map((definition) => (
              <button
                key={definition.tool}
                type="button"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(PALETTE_DRAG_MIME, definition.tool)
                  event.dataTransfer.effectAllowed = 'move'
                }}
                onClick={() => setActiveTool(definition.tool)}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border:
                    activeTool === definition.tool
                      ? '1px solid var(--accent)'
                      : '1px solid var(--border)',
                  background:
                    activeTool === definition.tool ? 'var(--accent-bg)' : 'var(--surface)',
                  display: 'grid',
                  gap: '4px',
                  cursor: 'grab',
                }}
              >
                <strong>{definition.label}</strong>
                <span style={{ fontSize: '12px', opacity: 0.75 }}>
                  {definition.description}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setActiveTool('select')}
              style={{
                textAlign: 'left',
                padding: '12px 14px',
                borderRadius: '12px',
                border:
                  activeTool === 'select'
                    ? '1px solid var(--accent)'
                    : '1px solid var(--border)',
                background: activeTool === 'select' ? 'var(--accent-bg)' : 'var(--surface)',
              }}
            >
              Pointer
            </button>
          </div>
        </aside>

        <div className="panel-resize-handle" onMouseDown={makeResizeHandler('left')} />
        <main className="workspace-canvas">
          <CanvasViewport
            workflowId={canvas.workflow.workflowId}
            nodes={canvas.nodes}
            edges={canvas.edges}
            selectedNodeId={selectedProcessId}
            selectedEdgeId={selectedConnectionId}
            canvasMode={canvasMode}
            drawingEnabled={activeTool !== 'select'}
            onNodeSelect={selectNode}
            onEdgeSelect={selectEdge}
            onNodeDragEnd={handleNodeDragEnd}
            onNodeResize={handleNodeResize}
            onConnectStart={handleConnectStart}
            onConnectComplete={handleConnectComplete}
            onCanvasClick={(position) => void createNodeAt(position)}
            onNodeDrop={(tool, position) => void createNodeFromTool(tool, position)}
            onFitViewReady={(fn) => { fitViewRef.current = fn }}
            onExportReady={(fn) => { exportPngRef.current = fn }}
            onEdgeReconnect={async (oldEdgeId, newConnection) => {
              await deleteConnection(oldEdgeId)
              await createConnection(newConnection)
            }}
            onConnectDropOnCanvas={(payload) =>
              openNodePicker({
                kind: 'connect-drop',
                flowPosition: payload.flowPosition,
                screenPosition: payload.screenPosition,
                draft: {
                  fromProcessId: payload.fromProcessId,
                  fromHandleId: payload.fromHandleId,
                  fromHandleType: payload.fromHandleType,
                },
              })
            }
          />
          {nodePicker && (
            <NodePickerPopup
              picker={nodePicker}
              definitions={paletteDefinitions}
              onPick={(tool) => void handleNodePick(tool)}
              onClose={closeNodePicker}
            />
          )}
        </main>

        <div className="panel-resize-handle" onMouseDown={makeResizeHandler('right')} />
        <aside className="workspace-panel workspace-panel--right" style={{ width: localPanelWidths.right }}>
          {inspectorMode === 'node' && (
            <NodeInspector
              node={selectedNode}
              selectedPort={selectedPort}
              rules={[]}
              onNodeSubmit={updateNode}
              onNodeDelete={deleteNodeWithConfirm}
              onPortCreate={createPort}
              onPortUpdate={updatePort}
              onPortDelete={deletePort}
              onOpenRuleBuilder={() => {}}
            />
          )}
          {inspectorMode === 'connection' && (
            <ConnectionInspector
              edge={selectedEdge}
              rules={[]}
              onSubmit={async (input) => { stopInlineEditEdge(); await updateConnection(input) }}
              focusLabel={inlineEditingEdgeId === selectedEdge?.id}
              onDelete={deleteConnection}
              onOpenRuleBuilder={() => {}}
            />
          )}
          {inspectorMode === 'multi' && (
            <div className="inspector-summary">
              <p>여러 노드가 선택됨</p>
              <p className="inspector-hint">
                Shift+클릭 또는 드래그로 다중 선택. Delete로 일괄 삭제는 아직 지원되지 않습니다.
              </p>
            </div>
          )}
          {inspectorMode === 'none' && (
            <div className="inspector-summary">
              <p>
                {canvas.nodes.length} nodes | {canvas.edges.length} connections
              </p>
              <p className="inspector-hint">Click a node or connection to inspect it.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
