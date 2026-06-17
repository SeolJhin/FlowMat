import { useWorkspaceStore } from '../model/workspaceStore'
import type { WorkflowCanvasViewModel } from '../../../entities/workflow/model/types'
import { CanvasViewport } from './CanvasViewport'
import { NodeInspector } from './NodeInspector'
import { ConnectionInspector } from './ConnectionInspector'
import type { ConnectCompletePayload, ConnectStartPayload } from '../../../entities/workflow/model/types'

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

  const selectedNode = selectedProcessId ? canvas.nodeMap[selectedProcessId] ?? null : null
  const selectedEdge = selectedConnectionId
    ? canvas.edges.find((e) => e.id === selectedConnectionId) ?? null
    : null
  const selectedPort = selectedPortId ? canvas.portMap[selectedPortId] ?? null : null

  function handleNodeDragEnd(processId: string, x: number, y: number) {
    // Sprint 2: useUpdateProcess mutation for optimistic position update
    console.log('node drag end', processId, x, y)
  }

  function handleConnectStart(payload: ConnectStartPayload) {
    console.log('connect start', payload)
  }

  function handleConnectComplete(payload: ConnectCompletePayload) {
    // Sprint 2: useCreateProcessConnection mutation
    console.log('connect complete', payload)
  }

  return (
    <div className="workspace-layout">
      <header className="workspace-topbar">
        <span className="workspace-topbar__project">{canvas.workflow.workflowName}</span>
        <span className="workspace-topbar__status">{canvas.workflow.workflowStatus}</span>
      </header>

      <div className="workspace-body">
        <aside className="workspace-panel workspace-panel--left">
          <p className="panel-placeholder">Template Palette (Sprint 2)</p>
        </aside>

        <main className="workspace-canvas">
          <CanvasViewport
            nodes={canvas.nodes}
            edges={canvas.edges}
            selectedNodeId={selectedProcessId}
            selectedEdgeId={selectedConnectionId}
            canvasMode={canvasMode}
            onNodeSelect={selectNode}
            onEdgeSelect={selectEdge}
            onNodeDragEnd={handleNodeDragEnd}
            onConnectStart={handleConnectStart}
            onConnectComplete={handleConnectComplete}
            onCanvasClick={clearSelection}
          />
        </main>

        <aside className="workspace-panel workspace-panel--right">
          {inspectorMode === 'node' && (
            <NodeInspector
              node={selectedNode}
              selectedPort={selectedPort}
              rules={[]}
              onNodeSubmit={async () => {}}
              onPortCreate={async () => {}}
              onPortUpdate={async () => {}}
              onPortDelete={async () => {}}
              onOpenRuleBuilder={() => {}}
            />
          )}
          {inspectorMode === 'connection' && (
            <ConnectionInspector
              edge={selectedEdge}
              rules={[]}
              onSubmit={async () => {}}
              onDelete={async () => {}}
              onOpenRuleBuilder={() => {}}
            />
          )}
          {inspectorMode === 'none' && (
            <div className="inspector-summary">
              <p>{canvas.nodes.length} nodes · {canvas.edges.length} connections</p>
              <p className="inspector-hint">Click a node or connection to inspect it.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
