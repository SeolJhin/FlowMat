import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  MarkerType,
  Position,
  type EdgeProps,
} from '@xyflow/react'
import type { CanvasEdgeViewModel } from '../../../entities/workflow/model/types'
import { useCanvasInteractionStore } from '../model/canvasInteractionStore'

interface CanvasEdgeComponentProps extends EdgeProps {
  data: CanvasEdgeViewModel
}

const CONNECTION_TYPE_STYLE: Record<string, { stroke: string; strokeDasharray?: string }> = {
  material:       { stroke: '#94a3b8' },
  material_flow:  { stroke: '#94a3b8' },
  fluid_flow:     { stroke: '#38bdf8' },
  energy_flow:    { stroke: '#fbbf24', strokeDasharray: '6 3' },
  data_flow:      { stroke: '#a78bfa' },
  event_flow:     { stroke: '#a78bfa', strokeDasharray: '4 2' },
  control_flow:   { stroke: '#f87171', strokeDasharray: '8 4' },
  human_flow:     { stroke: '#34d399' },
  equipment_flow: { stroke: '#fb923c' },
}

function resolveEdgePath(
  connectionType: string,
  params: {
    sourceX: number; sourceY: number; sourcePosition: Position
    targetX: number; targetY: number; targetPosition: Position
  }
): [string, number, number] {
  const { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition } = params

  if (connectionType === 'control_flow' || connectionType === 'energy_flow') {
    return getStraightPath({ sourceX, sourceY, targetX, targetY })
  }

  if (
    connectionType === 'material' ||
    connectionType === 'material_flow' ||
    connectionType === 'fluid_flow' ||
    connectionType === 'human_flow' ||
    connectionType === 'equipment_flow'
  ) {
    return getSmoothStepPath({
      sourceX, sourceY, sourcePosition,
      targetX, targetY, targetPosition,
      borderRadius: 8,
    })
  }

  // data_flow, event_flow, and unknown types → bezier curve
  return getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
}

export function CanvasEdge({
  id,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  selected,
  data: edge,
}: CanvasEdgeComponentProps) {
  const [edgePath, labelX, labelY] = resolveEdgePath(edge.connectionType, {
    sourceX, sourceY, sourcePosition: sourcePosition ?? Position.Right,
    targetX, targetY, targetPosition: targetPosition ?? Position.Left,
  })
  const typeStyle = CONNECTION_TYPE_STYLE[edge.connectionType] ?? { stroke: '#94a3b8' }
  const hovered = useCanvasInteractionStore((s) => s.hoveredEdgeId === id)
  const openNodePicker = useCanvasInteractionStore((s) => s.openNodePicker)
  const requestDeleteEdge = useCanvasInteractionStore((s) => s.requestDeleteEdge)

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={{
          type: MarkerType.ArrowClosed,
          color: selected ? '#6366f1' : typeStyle.stroke,
          width: 16,
          height: 16,
        }}
        style={{
          stroke: selected ? '#6366f1' : typeStyle.stroke,
          strokeWidth: selected ? 2.5 : 1.5,
          strokeDasharray: selected ? undefined : typeStyle.strokeDasharray,
        }}
      />
      {(hovered || selected) && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              display: 'flex',
              gap: '4px',
              pointerEvents: 'all',
            }}
          >
            <button
              type="button"
              className="edge-insert-button"
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
            <button
              type="button"
              className="edge-delete-button"
              title="연결선 삭제 (Delete)"
              onClick={(event) => {
                event.stopPropagation()
                requestDeleteEdge(id)
              }}
            >
              ×
            </button>
          </div>
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
