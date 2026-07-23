import type { WorkflowGraphChangeDto } from '../../../shared/types/api'
import type {
  CanvasEdgeViewModel,
  CanvasNodeViewModel,
  WorkflowCanvasViewModel,
} from './types'
import {
  buildWorkflowCanvasViewModel,
  toEdgeViewModel,
  toNodeViewModel,
} from './toWorkflowCanvasViewModel'

function upsertNode(nodes: CanvasNodeViewModel[], node: CanvasNodeViewModel) {
  const index = nodes.findIndex((item) => item.id === node.id)
  if (index === -1) {
    nodes.push(node)
    return
  }
  nodes[index] = node
}

function upsertEdge(edges: CanvasEdgeViewModel[], edge: CanvasEdgeViewModel) {
  const index = edges.findIndex((item) => item.id === edge.id)
  if (index === -1) {
    edges.push(edge)
    return
  }
  edges[index] = edge
}

export function applyGraphChangesToCanvas(
  canvas: WorkflowCanvasViewModel,
  changes: WorkflowGraphChangeDto[]
) {
  const nodes = [...canvas.nodes]
  const edges = [...canvas.edges]
  let graphSeq = canvas.graphSeq

  for (const change of changes) {
    graphSeq = Math.max(graphSeq, change.seq)

    if (change.changeType === 'WORKFLOW_UPDATED') {
      const workflow = change.payload?.workflow
      if (!workflow) continue
      canvas = {
        ...canvas,
        workflow: {
          workflowId: workflow.workflowId,
          projectId: workflow.projectId,
          workflowName: workflow.workflowName,
          workflowDesc: workflow.workflowDesc,
          workflowType: workflow.workflowType,
          workflowStatus: workflow.workflowStatus,
        },
      }
      continue
    }

    if (
      change.changeType === 'NODE_CREATED' ||
      change.changeType === 'NODE_UPDATED' ||
      change.changeType === 'PORT_CREATED' ||
      change.changeType === 'PORT_UPDATED' ||
      change.changeType === 'PORT_DELETED'
    ) {
      const process = change.payload?.process
      if (!process) continue
      upsertNode(nodes, toNodeViewModel(process, change.payload?.processIos ?? []))
      continue
    }

    if (change.changeType === 'NODE_DELETED') {
      const nextNodes = nodes.filter((node) => node.id !== change.entityId)
      const nextEdges = edges.filter((edge) => edge.source !== change.entityId && edge.target !== change.entityId)
      nodes.splice(0, nodes.length, ...nextNodes)
      edges.splice(0, edges.length, ...nextEdges)
      continue
    }

    if (change.changeType === 'CONNECTION_CREATED' || change.changeType === 'CONNECTION_UPDATED') {
      const connection = change.payload?.connection
      if (!connection) continue
      upsertEdge(edges, toEdgeViewModel(connection))
      continue
    }

    if (change.changeType === 'CONNECTION_DELETED') {
      const nextEdges = edges.filter((edge) => edge.id !== change.entityId)
      edges.splice(0, edges.length, ...nextEdges)
    }
  }

  return buildWorkflowCanvasViewModel(canvas.workflow, graphSeq, nodes, edges)
}
