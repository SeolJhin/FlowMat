import { BaseEdge, EdgeLabelRenderer, getStraightPath, type EdgeProps } from '@xyflow/react'
import type { CanvasEdgeViewModel } from '../../../entities/workflow/model/types'

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
  const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY })

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
