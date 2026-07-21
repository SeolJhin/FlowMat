// canvas_component_contracts.md 의 ConnectionInspector Props Contract를 축소 구현.
// 실제 서비스에서는 onSubmit 자리에 useUpdateProcessConnection() mutation hook을 연결하면 된다.

export default function ConnectionInspector({ edge, onFlowRateChange }) {
  if (!edge) return null

  return (
    <div className="inspector">
      <h3 className="inspector__title">연결 상세</h3>
      {edge.label && (
        <div className="inspector__row">
          <span className="inspector__label">라벨</span>
          <span>{edge.label}</span>
        </div>
      )}

      <label className="inspector__field">
        <span>유량 (flowRate)</span>
        <input
          value={edge.flowRate ?? ''}
          onChange={(e) => onFlowRateChange(edge.connectionId, e.target.value)}
        />
      </label>

      <div className="inspector__row">
        <span className="inspector__label">단위</span>
        <span>{edge.unit ?? '-'}</span>
      </div>
      <div className="inspector__row">
        <span className="inspector__label">지연시간</span>
        <span>{edge.delayTimeSec ?? '0'}초</span>
      </div>
      <div className="inspector__row">
        <span className="inspector__label">손실률</span>
        <span>{edge.lossRate ?? '0'}%</span>
      </div>
      <div className="inspector__row">
        <span className="inspector__label">우선순위</span>
        <span>{edge.priority}</span>
      </div>
    </div>
  )
}
