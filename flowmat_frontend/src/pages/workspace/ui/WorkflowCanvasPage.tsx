import { useState } from 'react'
import { useCreateProcessMutation } from '../../../entities/workflow/api/useCreateProcessMutation'
import { useCreateProcessConnectionMutation } from '../../../entities/workflow/api/useCreateProcessConnectionMutation'
import type {
  ConnectCompletePayload,
  ConnectStartPayload,
  WorkflowCanvasViewModel,
} from '../../../entities/workflow/model/types'
import { useWorkspaceStore } from '../model/workspaceStore'
import { CanvasViewport } from './CanvasViewport'
import { NodeInspector } from './NodeInspector'
import { ConnectionInspector } from './ConnectionInspector'

interface Props {
  canvas: WorkflowCanvasViewModel
}

function toOptionalIoId(handleId: string | null): string | null {
  if (!handleId || handleId === 'in-default' || handleId === 'out-default') {
    return null
  }

  return handleId
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
  const createProcessMutation = useCreateProcessMutation()
  const createConnectionMutation = useCreateProcessConnectionMutation()
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null)

  const selectedNode = selectedProcessId ? canvas.nodeMap[selectedProcessId] ?? null : null
  const selectedEdge = selectedConnectionId
    ? canvas.edges.find((edge) => edge.id === selectedConnectionId) ?? null
    : null
  const selectedPort = selectedPortId ? canvas.portMap[selectedPortId] ?? null : null

  async function handleAddNode() {
    setWorkspaceMessage(null)

    const nextIndex = canvas.nodes.length + 1
    const x = 120 + ((nextIndex - 1) % 4) * 220
    const y = 140 + Math.floor((nextIndex - 1) / 4) * 150

    try {
      await createProcessMutation.mutateAsync({
        workflowId: canvas.workflow.workflowId,
        processName: `Process ${nextIndex}`,
        processType: 'generic',
        nodeType: 'process',
        colorScheme: 'slate',
        posX: x,
        posY: y,
        width: 180,
        height: 88,
        processDesc: `Created from the canvas toolbar (${nextIndex}).`,
      })
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : 'Failed to create node.')
    }
  }

  function handleNodeDragEnd(processId: string, x: number, y: number) {
    // Position update mutation can be added next. Keep the interaction visible for now.
    console.log('node drag end', processId, x, y)
  }

  function handleConnectStart(payload: ConnectStartPayload) {
    console.log('connect start', payload)
  }

  async function handleConnectComplete(payload: ConnectCompletePayload) {
    setWorkspaceMessage(null)

    try {
      await createConnectionMutation.mutateAsync({
        workflowId: canvas.workflow.workflowId,
        fromProcessId: payload.fromProcessId,
        toProcessId: payload.toProcessId,
        fromIoId: toOptionalIoId(payload.fromIoId),
        toIoId: toOptionalIoId(payload.toIoId),
        sourceHandle: payload.sourceHandle,
        targetHandle: payload.targetHandle,
        connectionType: 'material',
        connectionLabel: null,
        flowRate: null,
        unit: null,
        delayTimeSec: 0,
        lossRate: 0,
        priority: 0,
      })
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : 'Failed to create connection.')
    }
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
          <button type="button" onClick={handleAddNode} disabled={createProcessMutation.isPending}>
            {createProcessMutation.isPending ? 'Adding node...' : 'Add Node'}
          </button>
          <span style={{ fontSize: '13px', opacity: 0.8 }}>
            Drag from a right handle to a left handle to create a connection.
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
          <p className="panel-placeholder">Template Palette (Sprint 2)</p>
          <p className="panel-placeholder" style={{ marginTop: '12px' }}>
            Use "Add Node" for now. Template-driven creation can replace it later.
          </p>
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
