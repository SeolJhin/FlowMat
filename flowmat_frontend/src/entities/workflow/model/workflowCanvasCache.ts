import type { QueryClient } from '@tanstack/react-query'
import type {
  ProcessConnectionDto,
  ProcessDto,
  ProcessIoDto,
  WorkflowDto,
} from '../../../shared/types/api'
import type {
  CanvasNodeViewModel,
  WorkflowCanvasViewModel,
} from './types'
import {
  buildWorkflowCanvasViewModel,
  toEdgeViewModel,
  toNodeViewModel,
  toPortViewModel,
} from './toWorkflowCanvasViewModel'

function rebuildCanvas(
  canvas: WorkflowCanvasViewModel,
  nodes: CanvasNodeViewModel[],
  edges = canvas.edges
) {
  return buildWorkflowCanvasViewModel(
    canvas.workflow,
    canvas.graphSeq,
    nodes,
    edges,
    canvas.annotations
  )
}

function mergeProcessNode(
  process: ProcessDto,
  currentNode?: CanvasNodeViewModel,
  processIos?: ProcessIoDto[]
) {
  if (processIos) {
    return toNodeViewModel(process, processIos)
  }
  if (!currentNode) {
    return toNodeViewModel(process, [])
  }
  return {
    ...currentNode,
    id: process.processId,
    processId: process.processId,
    projectId: process.projectId,
    workflowId: process.workflowId,
    name: process.processName,
    processType: process.processType,
    nodeType: process.nodeType,
    status: process.processStatus,
    colorScheme: process.colorScheme,
    position: { x: process.posX, y: process.posY },
    size: { width: process.width, height: process.height },
    description: process.processDesc,
    version: process.version,
    versionNonce: process.versionNonce,
  }
}

function updateNodePorts(node: CanvasNodeViewModel, port: ProcessIoDto, remove = false) {
  const nextPort = toPortViewModel(port)
  const isInput = port.direction === 'input'
  const currentPorts = isInput ? node.inputs : node.outputs
  const filtered = currentPorts.filter((entry) => entry.id !== port.processIoId)
  const nextPorts = remove ? filtered : [...filtered, nextPort]
  nextPorts.sort((a, b) => a.id.localeCompare(b.id))

  return {
    ...node,
    inputs: isInput ? nextPorts : node.inputs,
    outputs: isInput ? node.outputs : nextPorts,
    inputCount: isInput ? nextPorts.length : node.inputs.length,
    outputCount: isInput ? node.outputs.length : nextPorts.length,
  }
}

export function patchWorkflowCanvas(
  queryClient: QueryClient,
  workflowId: string,
  updater: (current: WorkflowCanvasViewModel) => WorkflowCanvasViewModel
) {
  queryClient.setQueryData<WorkflowCanvasViewModel>(['workflow-canvas', workflowId], (current) => {
    if (!current) return current
    return updater(current)
  })
}

export function patchWorkflowCanvasProcess(
  queryClient: QueryClient,
  process: ProcessDto,
  processIos?: ProcessIoDto[]
) {
  patchWorkflowCanvas(queryClient, process.workflowId, (current) => {
    const currentNode = current.nodeMap[process.processId]
    const nextNode = mergeProcessNode(process, currentNode, processIos)
    const nodes = currentNode
      ? current.nodes.map((node) => (node.id === nextNode.id ? nextNode : node))
      : [...current.nodes, nextNode]
    return rebuildCanvas(current, nodes)
  })
}

export function removeWorkflowCanvasProcess(
  queryClient: QueryClient,
  workflowId: string,
  processId: string
) {
  patchWorkflowCanvas(queryClient, workflowId, (current) => {
    const nodes = current.nodes.filter((node) => node.id !== processId)
    const edges = current.edges.filter((edge) => edge.source !== processId && edge.target !== processId)
    return rebuildCanvas(current, nodes, edges)
  })
}

export function patchWorkflowCanvasPort(
  queryClient: QueryClient,
  workflowId: string,
  processIo: ProcessIoDto
) {
  patchWorkflowCanvas(queryClient, workflowId, (current) => {
    const nodes = current.nodes.map((node) => {
      if (node.id !== processIo.processId) return node
      return updateNodePorts(node, processIo)
    })
    return rebuildCanvas(current, nodes)
  })
}

export function removeWorkflowCanvasPort(
  queryClient: QueryClient,
  workflowId: string,
  processIoId: string
) {
  patchWorkflowCanvas(queryClient, workflowId, (current) => {
    const nodes = current.nodes.map((node) => {
      const targetPort = [...node.inputs, ...node.outputs].find((port) => port.id === processIoId)
      if (!targetPort) return node
      const nextPort: ProcessIoDto = {
        processIoId: targetPort.processIoId,
        processId: targetPort.processId,
        itemId: targetPort.itemId,
        ioName: targetPort.name,
        direction: targetPort.direction,
        ioType: targetPort.ioType,
        quantity: targetPort.quantity === '' ? null : Number(targetPort.quantity),
        unit: targetPort.unit,
        formula: targetPort.formula,
        colorScheme: targetPort.colorScheme,
        requiredYn: targetPort.required ? 'Y' : 'N',
        allowShortageYn: targetPort.allowShortage ? 'Y' : 'N',
      }
      return updateNodePorts(node, nextPort, true)
    })
    const edges = current.edges.filter(
      (edge) => edge.fromIoId !== processIoId && edge.toIoId !== processIoId
    )
    return rebuildCanvas(current, nodes, edges)
  })
}

export function patchWorkflowCanvasConnection(
  queryClient: QueryClient,
  connection: ProcessConnectionDto
) {
  patchWorkflowCanvas(queryClient, connection.workflowId, (current) => {
    const nextEdge = toEdgeViewModel(connection)
    const existing = current.edges.some((edge) => edge.id === nextEdge.id)
    const nextEdges = existing
      ? current.edges.map((edge) => (edge.id === nextEdge.id ? nextEdge : edge))
      : [...current.edges, nextEdge]
    return rebuildCanvas(current, current.nodes, nextEdges)
  })
}

export function removeWorkflowCanvasConnection(
  queryClient: QueryClient,
  workflowId: string,
  connectionId: string
) {
  patchWorkflowCanvas(queryClient, workflowId, (current) => {
    const edges = current.edges.filter((edge) => edge.id !== connectionId)
    return rebuildCanvas(current, current.nodes, edges)
  })
}

export function patchWorkflowCanvasWorkflow(
  queryClient: QueryClient,
  workflow: WorkflowDto
) {
  patchWorkflowCanvas(queryClient, workflow.workflowId, (current) => ({
    ...current,
    workflow: {
      ...current.workflow,
      workflowId: workflow.workflowId,
      projectId: workflow.projectId,
      workflowName: workflow.workflowName,
      workflowDesc: workflow.workflowDesc,
      workflowType: workflow.workflowType,
      workflowStatus: workflow.workflowStatus,
    },
  }))
}
