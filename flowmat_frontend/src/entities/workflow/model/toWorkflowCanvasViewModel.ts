import type { WorkflowCanvasDto, ProcessIoDto } from '../../../shared/types/api'
import type {
  WorkflowCanvasViewModel,
  CanvasNodeViewModel,
  CanvasPortViewModel,
  CanvasEdgeViewModel,
} from './types'

function toPortViewModel(dto: ProcessIoDto): CanvasPortViewModel {
  return {
    id: dto.processIoId,
    processIoId: dto.processIoId,
    processId: dto.processId,
    itemId: dto.itemId,
    name: dto.ioName,
    direction: dto.direction,
    ioType: dto.ioType,
    quantity: String(dto.quantity ?? ''),
    unit: dto.unit,
    formula: dto.formula,
    colorScheme: dto.colorScheme,
    required: dto.requiredYn === 'Y',
    allowShortage: dto.allowShortageYn === 'Y',
    handleId: dto.processIoId,
  }
}

export function toWorkflowCanvasViewModel(dto: WorkflowCanvasDto): WorkflowCanvasViewModel {
  // Step 1: index processIos by processId
  const iosByProcess: Record<string, ProcessIoDto[]> = {}
  for (const io of dto.processIos) {
    if (!iosByProcess[io.processId]) iosByProcess[io.processId] = []
    iosByProcess[io.processId].push(io)
  }

  // Step 2 & 3: build nodes
  const nodes: CanvasNodeViewModel[] = dto.processes.map((p) => {
    const allIos = iosByProcess[p.processId] ?? []
    const inputs = allIos.filter((io) => io.direction === 'input').map(toPortViewModel)
    const outputs = allIos.filter((io) => io.direction === 'output').map(toPortViewModel)

    return {
      id: p.processId,
      processId: p.processId,
      projectId: p.projectId,
      workflowId: p.workflowId,
      name: p.processName,
      processType: p.processType,
      nodeType: p.nodeType,
      status: p.processStatus,
      colorScheme: p.colorScheme,
      position: { x: p.posX, y: p.posY },
      size: { width: p.width, height: p.height },
      description: p.processDesc,
      inputs,
      outputs,
      inputCount: inputs.length,
      outputCount: outputs.length,
    }
  })

  // Step 4: build edges
  const edges: CanvasEdgeViewModel[] = dto.connections.map((c) => ({
    id: c.connectionId,
    connectionId: c.connectionId,
    source: c.fromProcessId,
    target: c.toProcessId,
    sourceHandle: c.sourceHandle,
    targetHandle: c.targetHandle,
    fromProcessId: c.fromProcessId,
    toProcessId: c.toProcessId,
    fromIoId: c.fromIoId,
    toIoId: c.toIoId,
    connectionType: c.connectionType,
    label: c.connectionLabel,
    flowRate: c.flowRate !== null ? String(c.flowRate) : null,
    unit: c.unit,
    delayTimeSec: c.delayTimeSec,
    lossRate: c.lossRate,
    priority: c.priority,
  }))

  // Step 5: derive maps
  const nodeMap: Record<string, CanvasNodeViewModel> = {}
  const portMap: Record<string, CanvasPortViewModel> = {}

  for (const node of nodes) {
    nodeMap[node.id] = node
    for (const port of [...node.inputs, ...node.outputs]) {
      portMap[port.id] = port
    }
  }

  return {
    workflow: {
      workflowId: dto.workflow.workflowId,
      projectId: dto.workflow.projectId,
      workflowName: dto.workflow.workflowName,
      workflowDesc: dto.workflow.workflowDesc,
      workflowType: dto.workflow.workflowType,
      workflowStatus: dto.workflow.workflowStatus,
    },
    nodes,
    edges,
    nodeMap,
    portMap,
  }
}
