import type { ConnectCompletePayload, WorkflowCanvasViewModel } from './types'
import { getDefaultConnectionType } from './nodeCatalog'

export function normalizeConnectionIoId(handleId: string | null): string | null {
  if (!handleId || handleId === 'in-default' || handleId === 'out-default') {
    return null
  }

  return handleId
}

export function getRelatedConnectionIds(
  edges: Array<{ id: string; fromProcessId: string; toProcessId: string }>,
  processId: string
) {
  return edges
    .filter((edge) => edge.fromProcessId === processId || edge.toProcessId === processId)
    .map((edge) => edge.id)
}

export function buildDefaultConnectionPayload(
  workflowId: string,
  payload: ConnectCompletePayload,
  canvas?: WorkflowCanvasViewModel
) {
  const fromNode = canvas?.nodeMap[payload.fromProcessId]
  const connectionType = fromNode
    ? getDefaultConnectionType(fromNode.nodeType)
    : 'material_flow'

  return {
    workflowId,
    fromProcessId: payload.fromProcessId,
    toProcessId: payload.toProcessId,
    fromIoId: normalizeConnectionIoId(payload.fromIoId),
    toIoId: normalizeConnectionIoId(payload.toIoId),
    sourceHandle: payload.sourceHandle,
    targetHandle: payload.targetHandle,
    connectionType,
    connectionLabel: null,
    flowRate: null,
    unit: null,
    delayTimeSec: 0,
    lossRate: 0,
    priority: 0,
  }
}
