import { useCallback, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { sampleWorkflowCanvasResponse } from '../api/sampleWorkflowCanvasResponse'
import { toWorkflowCanvasViewModel } from '../model/toWorkflowCanvasViewModel'
import CanvasNode from './CanvasNode'
import CanvasEdge from './CanvasEdge'
import NodeInspector from './NodeInspector'
import ConnectionInspector from './ConnectionInspector'

// workflow_canvas_state_machine.md 의 selectionState 우선순위를 단순화해 구현:
// process_io 는 노드 내부에 표시되므로, 이 프로토타입에서는
// 'process' | 'connection' | 'none' 세 가지만 다룬다.

const nodeTypes = { flowmatNode: CanvasNode }
const edgeTypes = { flowmatEdge: CanvasEdge }

function toReactFlowNode(vm) {
  return {
    id: vm.id,
    type: 'flowmatNode',
    position: vm.position,
    data: vm,
    style: { width: vm.size.width },
  }
}

function toReactFlowEdge(vm) {
  return {
    id: vm.id,
    type: 'flowmatEdge',
    source: vm.source,
    target: vm.target,
    sourceHandle: vm.sourceHandle,
    targetHandle: vm.targetHandle,
    data: vm,
  }
}

export default function WorkflowCanvasPage() {
  // 1. REST DTO -> ViewModel (실제 서비스에서는 useWorkflowCanvasQuery(workflowId) 결과로 대체)
  const canvas = useMemo(
    () => toWorkflowCanvasViewModel(sampleWorkflowCanvasResponse),
    [],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(canvas.nodes.map(toReactFlowNode))
  const [edges, setEdges, onEdgesChange] = useEdgesState(canvas.edges.map(toReactFlowEdge))

  // selectionState: contract 기준 단순화 버전
  const [selection, setSelection] = useState({ type: 'none' })

  const onConnect = useCallback(
    (params) => {
      // canvasMode: connecting -> submitting_mutation 에 해당.
      // 실제 서비스에서는 여기서 useCreateProcessConnection().mutate(...) 호출.
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'flowmatEdge',
            data: {
              connectionId: `local-${Date.now()}`,
              label: '새 연결',
              flowRate: null,
              unit: null,
              delayTimeSec: '0',
              lossRate: '0',
              priority: 1,
            },
          },
          eds,
        ),
      )
    },
    [setEdges],
  )

  const onNodeClick = useCallback((_evt, node) => {
    setSelection({ type: 'process', processId: node.id })
  }, [])

  const onEdgeClick = useCallback((_evt, edge) => {
    setSelection({ type: 'connection', connectionId: edge.id })
  }, [])

  const onPaneClick = useCallback(() => {
    setSelection({ type: 'none' })
  }, [])

  const onNodeDragStop = useCallback((_evt, node) => {
    // workflow_canvas_state_machine.md: "backend persistence should happen on drag end,
    // not every pointer move". 실제 서비스에서는 여기서 useUpdateProcess({ processId, x, y }) 호출.
    console.log('[persist position]', node.id, node.position)
  }, [])

  const handleNodeNameChange = useCallback(
    (processId, name) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === processId ? { ...n, data: { ...n.data, name } } : n,
        ),
      )
    },
    [setNodes],
  )

  const handleFlowRateChange = useCallback(
    (connectionId, flowRate) => {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === connectionId ? { ...e, data: { ...e.data, flowRate } } : e,
        ),
      )
    },
    [setEdges],
  )

  const selectedNode =
    selection.type === 'process' ? nodes.find((n) => n.id === selection.processId)?.data : null
  const selectedEdge =
    selection.type === 'connection' ? edges.find((e) => e.id === selection.connectionId)?.data : null

  return (
    <div className="workflow-canvas-page">
      <header className="workflow-canvas-page__header">
        <h1>{canvas.workflow.name}</h1>
        <p>{canvas.workflow.description}</p>
      </header>

      <div className="workflow-canvas-page__body">
        <div className="workflow-canvas-page__canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onNodeDragStop={onNodeDragStop}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </div>

        <aside className="workflow-canvas-page__inspector">
          {selection.type === 'process' && (
            <NodeInspector node={selectedNode} onNodeNameChange={handleNodeNameChange} />
          )}
          {selection.type === 'connection' && (
            <ConnectionInspector edge={selectedEdge} onFlowRateChange={handleFlowRateChange} />
          )}
          {selection.type === 'none' && (
            <div className="inspector inspector--empty">
              <p>노드나 연결선을 클릭하면 상세 정보가 여기에 표시됩니다.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
