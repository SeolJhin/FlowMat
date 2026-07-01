import { useEffect } from 'react'
import type {
  ConnectCompletePayload,
  ConnectStartPayload,
  WorkflowCanvasViewModel,
} from '../../../entities/workflow/model/types'
import { useWorkspaceStore } from '../model/workspaceStore'
import { useWorkflowCanvasActions } from '../model/useWorkflowCanvasActions'
import { CanvasViewport } from './CanvasViewport'
import { ConnectionInspector } from './ConnectionInspector'
import { NodeInspector } from './NodeInspector'

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
  } = useWorkspaceStore()

  const {
    activeTool,
    setActiveTool,
    workspaceMessage,
    paletteDefinitions,
    commandHistory,
    addNode,
    createNodeAt,
    updateNode,
    createPort,
    updatePort,
    deletePort,
    saveNodePosition,
    deleteConnection,
    deleteNode,
    createConnection,
  } = useWorkflowCanvasActions({ canvas, clearSelection })

  const { past, future, undo, redo } = commandHistory

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        void undo()
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        void redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  const selectedNode = selectedProcessId ? canvas.nodeMap[selectedProcessId] ?? null : null
  const selectedEdge = selectedConnectionId
    ? canvas.edges.find((edge) => edge.id === selectedConnectionId) ?? null
    : null
  const selectedPort = selectedPortId ? canvas.portMap[selectedPortId] ?? null : null

  async function handleNodeDragEnd(processId: string, x: number, y: number) {
    await saveNodePosition(processId, x, y)
  }

  async function handleNodeResize(processId: string, width: number, height: number) {
    await updateNode({ processId, width: Math.round(width), height: Math.round(height) })
  }

  function handleConnectStart(payload: ConnectStartPayload) {
    console.log('connect start', payload)
  }

  async function handleConnectComplete(payload: ConnectCompletePayload) {
    await createConnection(payload)
  }

  return (
    <div className="workspace-layout">
      <header className="workspace-topbar">
        <div style={{ display: 'grid', gap: '4px' }}>
          <span className="workspace-topbar__project">{canvas.workflow.workflowName}</span>
          <span className="workspace-topbar__status">
            {canvas.workflow.workflowStatus} | {canvas.workflow.workflowType}
          </span>
        </div>
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
        <aside className="workspace-panel workspace-panel--left">
          <div style={{ display: 'grid', gap: '10px' }}>
            <h3 style={{ margin: 0 }}>Node Palette</h3>
            <p className="panel-placeholder" style={{ margin: 0 }}>
              Pick a workflow node, then click any empty canvas area.
            </p>
            {paletteDefinitions.map((definition) => (
              <button
                key={definition.tool}
                type="button"
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

        <main className="workspace-canvas">
          <CanvasViewport
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
          />
        </main>

        <aside className="workspace-panel workspace-panel--right">
          {inspectorMode === 'node' && (
            <NodeInspector
              node={selectedNode}
              selectedPort={selectedPort}
              rules={[]}
              onNodeSubmit={updateNode}
              onNodeDelete={deleteNode}
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
              onSubmit={async () => {}}
              onDelete={deleteConnection}
              onOpenRuleBuilder={() => {}}
            />
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
