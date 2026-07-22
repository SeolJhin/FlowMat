import { useCallback, useEffect, useRef, useState } from 'react'
import { useIsMutating, useQueryClient } from '@tanstack/react-query'
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
import { useUpdateWorkflowMutation } from '../../../entities/workflow/api/useUpdateWorkflowMutation'
import type { PresenceMessage, GraphChangeMessage } from '../../../entities/workflow/api/useWorkflowSync'
import { Link, useNavigate } from 'react-router-dom'
import { CanvasViewport, PALETTE_DRAG_MIME } from './CanvasViewport'
import { ConnectionInspector } from './ConnectionInspector'
import { NodeInspector } from './NodeInspector'
import { NodePickerPopup } from './NodePickerPopup'

interface Props {
  canvas: WorkflowCanvasViewModel
  projectId: string
}

export function WorkflowCanvasPage({ canvas, projectId: _projectId }: Props) {
  const {
    selectedProcessId,
    selectedConnectionId,
    selectedPortId,
    inspectorMode,
    selectNode,
    selectEdge,
    clearSelection,
    pendingRename,
    clearPendingRename,
    inlineEditingEdgeId,
    stopInlineEditEdge,
    panelWidths,
  } = useWorkspaceStore()

  const panelWidthRef = useRef(panelWidths)
  panelWidthRef.current = panelWidths
  const [localPanelWidths, setLocalPanelWidths] = useState(panelWidths)

  const makeResizeHandler = useCallback(
    (side: 'left' | 'right') =>
      (e: React.MouseEvent) => {
        e.preventDefault()
        const startX = e.clientX
        const startWidth = side === 'left' ? localPanelWidths.left : localPanelWidths.right
        function onMove(ev: MouseEvent) {
          const delta = side === 'left' ? ev.clientX - startX : startX - ev.clientX
          setLocalPanelWidths((w) => ({ ...w, [side]: Math.max(160, Math.min(400, startWidth + delta)) }))
        }
        function onUp() {
          window.removeEventListener('mousemove', onMove)
          window.removeEventListener('mouseup', onUp)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
      },
    [localPanelWidths.left, localPanelWidths.right]
  )

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
    duplicateNode,
    batchUpdateNodePositions,
    updateConnection,
    deleteConnection,
    deleteNode,
    createConnection,
  } = useWorkflowCanvasActions({ canvas, clearSelection })

  const navigate = useNavigate()
  const updateWorkflowMutation = useUpdateWorkflowMutation()
  const workflowsQuery = useWorkflowsQuery(canvas.workflow.projectId)

  // Presence: remote cursor state
  const [remoteCursors, setRemoteCursors] = useState<
    Map<string, { x: number; y: number; type: string }>
  >(new Map())
  const [syncClientId, setSyncClientId] = useState('')
  const sendPresenceRef = useRef<
    (msg: Omit<PresenceMessage, 'userId' | 'workflowId' | 'timestamp'>) => void
  >(() => {})

  const handlePresence = useCallback((msg: PresenceMessage) => {
    if (!msg.userId) return
    setRemoteCursors((prev) => {
      const next = new Map(prev)
      if (msg.type === 'LEAVE') {
        next.delete(msg.userId!)
      } else if (msg.type === 'CURSOR_MOVED' && msg.cursorX != null && msg.cursorY != null) {
        next.set(msg.userId!, { x: msg.cursorX, y: msg.cursorY, type: msg.type })
      } else if (msg.type === 'JOIN') {
        next.set(msg.userId!, { x: 0, y: 0, type: msg.type })
      }
      return next
    })
  }, [])

  const queryClient = useQueryClient()

  const handleGraphChange = useCallback((_msg: GraphChangeMessage) => {
    void queryClient.invalidateQueries({
      queryKey: ['workflow-canvas', canvas.workflow.workflowId],
    })
  }, [queryClient, canvas.workflow.workflowId])

  const handleSyncReady = useCallback((api: {
    sendPresence: (msg: Omit<PresenceMessage, 'userId' | 'workflowId' | 'timestamp'>) => void
    clientId: string
  }) => {
    sendPresenceRef.current = api.sendPresence
    setSyncClientId(api.clientId)
  }, [])

  useEffect(() => {
    sendPresenceRef.current({ type: 'NODE_EDITING', editingProcessId: selectedProcessId ?? undefined })
  }, [selectedProcessId])

  const workflows = workflowsQuery.data ?? []
  const [editingWorkflowName, setEditingWorkflowName] = useState(false)
  const [draftWorkflowName, setDraftWorkflowName] = useState(canvas.workflow.workflowName)
  const workflowNameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingWorkflowName) workflowNameInputRef.current?.select()
  }, [editingWorkflowName])

  async function commitWorkflowName() {
    setEditingWorkflowName(false)
    const trimmed = draftWorkflowName.trim()
    if (!trimmed || trimmed === canvas.workflow.workflowName) return
    await updateWorkflowMutation.mutateAsync({
      workflowId: canvas.workflow.workflowId,
      workflowName: trimmed,
    })
  }

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
  }, [isMutating, savedLabel])

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
  const pendingDuplicateNodeId = useCanvasInteractionStore((s) => s.pendingDuplicateNodeId)
  const clearDuplicateRequest = useCanvasInteractionStore((s) => s.clearDuplicateRequest)
  const pendingColorChange = useCanvasInteractionStore((s) => s.pendingColorChange)
  const clearColorChange = useCanvasInteractionStore((s) => s.clearColorChange)

  const { past, future, undo, redo } = commandHistory

  // Declare refs and stable callbacks BEFORE any useEffect that references them
  const canvasRef = useRef(canvas)
  canvasRef.current = canvas
  const canvasContainerRef = useRef<HTMLElement>(null)
  const fitViewRef = useRef<() => void>(() => {})
  const selectAllRef = useRef<() => void>(() => {})
  const exportPngRef = useRef<(filename: string) => void>(() => {})

  const deleteNodeWithConfirm = useCallback(
    async (processId: string) => {
      const relatedCount = getRelatedConnectionIds(canvasRef.current.edges, processId).length
      if (
        relatedCount === 0 ||
        window.confirm(
          `이 노드를 삭제하면 연결된 연결선 ${relatedCount}개도 함께 삭제됩니다. 계속하시겠습니까?`
        )
      ) {
        await deleteNode(processId)
      }
    },
    [deleteNode]
  )

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
        duplicateNode,
        clearSelection,
        selectAll: () => selectAllRef.current(),
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


  useEffect(() => {
    if (pendingDeleteNodeId) {
      clearDeleteRequest()
      void deleteNodeWithConfirm(pendingDeleteNodeId)
    }
  }, [pendingDeleteNodeId, clearDeleteRequest, deleteNodeWithConfirm])

  useEffect(() => {
    if (pendingDeleteEdgeId) {
      clearDeleteRequest()
      void deleteConnection(pendingDeleteEdgeId)
    }
  }, [pendingDeleteEdgeId, clearDeleteRequest, deleteConnection])

  useEffect(() => {
    if (pendingDuplicateNodeId) {
      clearDuplicateRequest()
      void duplicateNode(pendingDuplicateNodeId)
    }
  }, [pendingDuplicateNodeId, clearDuplicateRequest, duplicateNode])

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

  async function handleNodeDragEnd(processId: string, x: number, y: number) {
    await saveNodePosition(processId, x, y)
  }

  async function handleNodeResize(processId: string, width: number, height: number) {
    await updateNode({ processId, width: Math.round(width), height: Math.round(height) })
  }

  function handleConnectStart(_payload: ConnectStartPayload) {
    // pendingConnectionDraft reserved for future collaboration feature
  }

  async function handleConnectComplete(payload: ConnectCompletePayload) {
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
          <Link to="/" className="topbar-home-link" title="홈으로">← 홈</Link>
          <div style={{ display: 'grid', gap: '4px' }}>
            {editingWorkflowName ? (
              <input
                ref={workflowNameInputRef}
                className="workspace-topbar__name-input"
                value={draftWorkflowName}
                onChange={(e) => setDraftWorkflowName(e.target.value)}
                onBlur={() => void commitWorkflowName()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void commitWorkflowName()
                  if (e.key === 'Escape') {
                    setDraftWorkflowName(canvas.workflow.workflowName)
                    setEditingWorkflowName(false)
                  }
                }}
              />
            ) : (
              <span
                className="workspace-topbar__project"
                title="더블클릭하여 이름 변경"
                onDoubleClick={() => {
                  setDraftWorkflowName(canvas.workflow.workflowName)
                  setEditingWorkflowName(true)
                }}
              >
                {canvas.workflow.workflowName}
              </span>
            )}
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
        {remoteCursors.size > 0 && (
          <div className="presence-avatars" title={`${remoteCursors.size}명 접속 중`}>
            {[...remoteCursors.keys()]
              .filter((uid) => uid !== syncClientId)
              .slice(0, 5)
              .map((uid) => (
                <span key={uid} className="presence-avatar" title={uid}>
                  {uid.slice(0, 2).toUpperCase()}
                </span>
              ))}
            {remoteCursors.size > 5 && (
              <span className="presence-avatar presence-avatar--overflow">+{remoteCursors.size - 5}</span>
            )}
          </div>
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
        <main ref={canvasContainerRef as React.RefObject<HTMLElement>} className="workspace-canvas">
          <CanvasViewport
            workflowId={canvas.workflow.workflowId}
            nodes={canvas.nodes}
            edges={canvas.edges}
            selectedNodeId={selectedProcessId}
            selectedEdgeId={selectedConnectionId}
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
            onSelectAllReady={(fn) => { selectAllRef.current = fn }}
            onExportReady={(fn) => { exportPngRef.current = fn }}
            onPresence={handlePresence}
            onGraphChange={handleGraphChange}
            onSyncReady={handleSyncReady}
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
          {/* Remote cursor overlay — cursor coords are window-relative, subtract canvas rect */}
          {(() => {
            const rect = canvasContainerRef.current?.getBoundingClientRect()
            if (!rect) return null
            return [...remoteCursors.entries()]
              .filter(([uid]) => uid !== syncClientId)
              .map(([uid, cursor]) => (
                <div
                  key={uid}
                  className="remote-cursor"
                  style={{ left: cursor.x - rect.left, top: cursor.y - rect.top }}
                >
                  <div className="remote-cursor__dot" />
                  <span className="remote-cursor__label">{uid.slice(0, 8)}</span>
                </div>
              ))
          })()}
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
