import type {
  WorkflowCanvasDto,
  ProcessDto,
  ProcessIoDto,
  ProcessConnectionDto,
} from '../../../shared/types/api'
import type {
  WorkflowCanvasViewModel,
  CanvasNodeViewModel,
  CanvasPortViewModel,
  CanvasEdgeViewModel,
  WorkflowHeaderViewModel,
} from './types'

export function toPortViewModel(dto: ProcessIoDto): CanvasPortViewModel {
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

export function toNodeViewModel(dto: ProcessDto, processIos: ProcessIoDto[]): CanvasNodeViewModel {
  const inputs = processIos.filter((io) => io.direction === 'input').map(toPortViewModel)
  const outputs = processIos.filter((io) => io.direction === 'output').map(toPortViewModel)

  return {
    id: dto.processId,
    processId: dto.processId,
    projectId: dto.projectId,
    workflowId: dto.workflowId,
    name: dto.processName,
    processType: dto.processType,
    nodeType: dto.nodeType,
    status: dto.processStatus,
    colorScheme: dto.colorScheme,
    position: { x: dto.posX, y: dto.posY },
    size: { width: dto.width, height: dto.height },
    description: dto.processDesc,
    inputs,
    outputs,
    inputCount: inputs.length,
    outputCount: outputs.length,
    version: dto.version,
    versionNonce: dto.versionNonce,
  }
}

export function toEdgeViewModel(dto: ProcessConnectionDto): CanvasEdgeViewModel {
  return {
    id: dto.connectionId,
    connectionId: dto.connectionId,
    source: dto.fromProcessId,
    target: dto.toProcessId,
    sourceHandle: dto.sourceHandle,
    targetHandle: dto.targetHandle,
    fromProcessId: dto.fromProcessId,
    toProcessId: dto.toProcessId,
    fromIoId: dto.fromIoId,
    toIoId: dto.toIoId,
    itemId: dto.itemId,
    connectionType: dto.connectionType,
    label: dto.connectionLabel,
    flowRate: dto.flowRate !== null ? String(dto.flowRate) : null,
    unit: dto.unit,
    delayTimeSec: dto.delayTimeSec,
    lossRate: dto.lossRate,
    priority: dto.priority,
    version: dto.version,
    versionNonce: dto.versionNonce,
  }
}

export function buildWorkflowCanvasViewModel(
  workflow: WorkflowHeaderViewModel,
  graphSeq: number,
  nodes: CanvasNodeViewModel[],
  edges: CanvasEdgeViewModel[]
): WorkflowCanvasViewModel {
  const nodeMap: Record<string, CanvasNodeViewModel> = {}
  const portMap: Record<string, CanvasPortViewModel> = {}

  for (const node of nodes) {
    nodeMap[node.id] = node
    for (const port of [...node.inputs, ...node.outputs]) {
      portMap[port.id] = port
    }
  }

  return {
    workflow,
    graphSeq,
    nodes,
    edges,
    nodeMap,
    portMap,
  }
}

export function toWorkflowCanvasViewModel(dto: WorkflowCanvasDto): WorkflowCanvasViewModel {
  const iosByProcess: Record<string, ProcessIoDto[]> = {}
  for (const io of dto.processIos) {
    if (!iosByProcess[io.processId]) iosByProcess[io.processId] = []
    iosByProcess[io.processId].push(io)
  }

  const workflow: WorkflowHeaderViewModel = {
    workflowId: dto.workflow.workflowId,
    projectId: dto.workflow.projectId,
    workflowName: dto.workflow.workflowName,
    workflowDesc: dto.workflow.workflowDesc,
    workflowType: dto.workflow.workflowType,
    workflowStatus: dto.workflow.workflowStatus,
  }
  const nodes = dto.processes.map((process) => toNodeViewModel(process, iosByProcess[process.processId] ?? []))
  const edges = dto.connections.map(toEdgeViewModel)

  return buildWorkflowCanvasViewModel(workflow, dto.graphSeq, nodes, edges)
}
