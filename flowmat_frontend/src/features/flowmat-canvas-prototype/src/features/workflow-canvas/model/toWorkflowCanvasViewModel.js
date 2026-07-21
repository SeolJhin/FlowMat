// canvas_component_contracts.md 의 "DTO to View Model Conversion" 절을 그대로 구현한 파일입니다.
//
// 변환 흐름:
// 1. 모든 processIos를 processId 기준으로 인덱싱
// 2. port를 inputs / outputs로 그룹화
// 3. CanvasNodeViewModel[] 생성
// 4. CanvasEdgeViewModel[] 생성
// 5. lookup map(nodeMap, portMap) 파생
//
// 이 함수는 pure function 이어야 한다는 문서 규칙을 지킵니다. (입력을 변형하지 않고 새 객체만 반환)

function toPortViewModel(io) {
  return {
    id: io.processIoId,
    processIoId: io.processIoId,
    processId: io.processId,
    itemId: io.itemId,
    name: io.ioName,
    direction: io.direction,
    ioType: io.ioType,
    quantity: String(io.quantity ?? ''),
    unit: io.unit,
    formula: io.formula ?? null,
    colorScheme: io.colorScheme,
    required: io.requiredYn === 'Y',
    allowShortage: io.allowShortageYn === 'Y',
    handleId: io.processIoId,
  }
}

function toNodeViewModel(process, portsByProcessId) {
  const ports = portsByProcessId[process.processId] ?? []
  const inputs = ports.filter((p) => p.direction === 'input')
  const outputs = ports.filter((p) => p.direction === 'output')

  return {
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
    description: process.processDesc ?? null,
    inputs,
    outputs,
    inputCount: inputs.length,
    outputCount: outputs.length,
  }
}

function toEdgeViewModel(connection) {
  return {
    id: connection.connectionId,
    connectionId: connection.connectionId,
    source: connection.fromProcessId,
    target: connection.toProcessId,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
    fromProcessId: connection.fromProcessId,
    toProcessId: connection.toProcessId,
    fromIoId: connection.fromIoId ?? null,
    toIoId: connection.toIoId ?? null,
    itemId: connection.itemId ?? null,
    connectionType: connection.connectionType,
    label: connection.connectionLabel ?? null,
    flowRate: connection.flowRate != null ? String(connection.flowRate) : null,
    unit: connection.unit ?? null,
    delayTimeSec: connection.delayTimeSec != null ? String(connection.delayTimeSec) : null,
    lossRate: connection.lossRate != null ? String(connection.lossRate) : null,
    priority: connection.priority,
  }
}

export function toWorkflowCanvasViewModel(dto) {
  const { workflow, processes = [], processIos = [], connections = [] } = dto

  // 1. processId 기준으로 인덱싱 + 2. inputs/outputs 그룹화는 toNodeViewModel 내부에서 처리
  const portsByProcessId = {}
  for (const io of processIos) {
    const vm = toPortViewModel(io)
    if (!portsByProcessId[vm.processId]) portsByProcessId[vm.processId] = []
    portsByProcessId[vm.processId].push(vm)
  }

  // 3. CanvasNodeViewModel[] 생성
  const nodes = processes.map((p) => toNodeViewModel(p, portsByProcessId))

  // 4. CanvasEdgeViewModel[] 생성
  const edges = connections.map(toEdgeViewModel)

  // 5. lookup map 파생
  const nodeMap = {}
  for (const n of nodes) nodeMap[n.id] = n

  const portMap = {}
  for (const ports of Object.values(portsByProcessId)) {
    for (const p of ports) portMap[p.id] = p
  }

  return {
    workflow: {
      workflowId: workflow.workflowId,
      projectId: workflow.projectId,
      name: workflow.workflowName,
      description: workflow.workflowDesc ?? null,
      workflowType: workflow.workflowType,
      workflowStatus: workflow.workflowStatus,
    },
    nodes,
    edges,
    nodeMap,
    portMap,
  }
}
