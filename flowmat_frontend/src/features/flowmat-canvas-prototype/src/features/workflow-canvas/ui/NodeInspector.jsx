// canvas_component_contracts.md 의 NodeInspector Props Contract를 축소 구현.
// 실제 서비스에서는 onNodeSubmit 자리에 useUpdateProcess() 같은 mutation hook을 연결하면 된다.

export default function NodeInspector({ node, onNodeNameChange }) {
  if (!node) {
    return (
      <div className="inspector inspector--empty">
        <p>노드나 연결선을 클릭하면 상세 정보가 여기에 표시됩니다.</p>
      </div>
    )
  }

  return (
    <div className="inspector">
      <h3 className="inspector__title">공정 상세</h3>

      <label className="inspector__field">
        <span>공정명</span>
        <input
          value={node.name}
          onChange={(e) => onNodeNameChange(node.processId, e.target.value)}
        />
      </label>

      <div className="inspector__row">
        <span className="inspector__label">유형</span>
        <span>{node.processType}</span>
      </div>
      <div className="inspector__row">
        <span className="inspector__label">상태</span>
        <span>{node.status}</span>
      </div>
      {node.description && (
        <div className="inspector__row">
          <span className="inspector__label">설명</span>
          <span>{node.description}</span>
        </div>
      )}

      <h4 className="inspector__subtitle">입력 ({node.inputCount})</h4>
      <ul className="inspector__port-list">
        {node.inputs.map((p) => (
          <li key={p.id}>
            {p.name} — {p.quantity} {p.unit}
            {p.required && <span className="inspector__badge">필수</span>}
          </li>
        ))}
      </ul>

      <h4 className="inspector__subtitle">출력 ({node.outputCount})</h4>
      <ul className="inspector__port-list">
        {node.outputs.map((p) => (
          <li key={p.id}>
            {p.name} — {p.quantity} {p.unit}
            {p.formula && <span className="inspector__formula">f({p.formula})</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
