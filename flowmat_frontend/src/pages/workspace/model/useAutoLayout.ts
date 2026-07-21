import { useCallback } from 'react'
import dagre from '@dagrejs/dagre'
import type { CanvasNodeViewModel, CanvasEdgeViewModel, UpdateProcessInput } from '../../../entities/workflow/model/types'

export type LayoutDirection = 'TB' | 'LR'

interface UseAutoLayoutOptions {
  nodes: CanvasNodeViewModel[]
  edges: CanvasEdgeViewModel[]
  onUpdateNode(input: UpdateProcessInput): Promise<void>
  onFitView?(): void
}

export function useAutoLayout({ nodes, edges, onUpdateNode, onFitView }: UseAutoLayoutOptions) {
  const applyLayout = useCallback(
    async (direction: LayoutDirection) => {
      if (nodes.length === 0) return

      const graph = new dagre.graphlib.Graph()
      graph.setDefaultEdgeLabel(() => ({}))
      graph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80 })

      for (const node of nodes) {
        graph.setNode(node.id, { width: node.size.width, height: node.size.height })
      }
      for (const edge of edges) {
        graph.setEdge(edge.source, edge.target)
      }

      dagre.layout(graph)

      await Promise.all(
        nodes.map((node) => {
          const { x, y } = graph.node(node.id)
          return onUpdateNode({
            processId: node.id,
            posX: Math.round(x - node.size.width / 2),
            posY: Math.round(y - node.size.height / 2),
          })
        })
      )

      setTimeout(() => onFitView?.(), 100)
    },
    [nodes, edges, onUpdateNode, onFitView]
  )

  return { applyLayout }
}
