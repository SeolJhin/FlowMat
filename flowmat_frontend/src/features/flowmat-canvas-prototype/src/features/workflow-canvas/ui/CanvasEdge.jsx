import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from '@xyflow/react'

// canvas_component_contracts.md 의 CanvasEdge Props Contract 반영.
// flowRate / unit / delayTimeSec 같은 제조 도메인 속성을 라벨로 시각화한다.

export default function CanvasEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  })

  const flowLabel = data?.flowRate ? `${data.flowRate} ${data.unit ?? ''}`.trim() : null
  const delay = data?.delayTimeSec && data.delayTimeSec !== '0' ? `+${data.delayTimeSec}s` : null

  return (
    <>
      <BaseEdge id={id} path={edgePath} className={selected ? 'flowmat-edge is-selected' : 'flowmat-edge'} />
      {flowLabel && (
        <EdgeLabelRenderer>
          <div
            className="flowmat-edge__label"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {flowLabel}
            {delay && <span className="flowmat-edge__delay">{delay}</span>}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
