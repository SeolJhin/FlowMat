import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react'
import type { CanvasEdgeViewModel } from '../../../entities/workflow/model/types'
import { useCanvasInteractionStore } from '../model/canvasInteractionStore'

interface CanvasEdgeComponentProps extends EdgeProps {
  data: CanvasEdgeViewModel
}

export function CanvasEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  data: edge,
}: CanvasEdgeComponentProps) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY })
  const hovered = useCanvasInteractionStore((s) => s.hoveredEdgeId === id)
  const openNodePicker = useCanvasInteractionStore((s) => s.openNodePicker)

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? '#6366f1' : '#94a3b8',
          strokeWidth: selected ? 2.5 : 1.5,
        }}
      />
      {/* Center "+" insert handle (ported from tldraw's
          ConnectionCenterHandleOverlayUtil): click to split this connection
          with a new node. */}
      {(hovered || selected) && (
        <EdgeLabelRenderer>
          <button
            type="button"
            className="edge-insert-button nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            title="Insert node into connection"
            onClick={(event) => {
              event.stopPropagation()
              openNodePicker({
                kind: 'insert-on-edge',
                edgeId: id,
                flowPosition: { x: labelX, y: labelY },
                screenPosition: { x: event.clientX, y: event.clientY },
              })
            }}
          >
            +
          </button>
        </EdgeLabelRenderer>
      )}
      {edge.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              fontSize: 11,
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: 4,
              padding: '1px 6px',
              color: '#475569',
            }}
            className="nodrag nopan"
          >
            {edge.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
