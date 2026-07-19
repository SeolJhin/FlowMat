import { Handle, Position } from '@xyflow/react'

// canvas_component_contracts.md 의 CanvasNode Props Contract를 반영한 커스텀 노드.
// - handleId = processIoId 규칙을 그대로 사용 (workflow_canvas_state_machine.md "Handle Rules")
// - 입력 포트는 왼쪽(Target), 출력 포트는 오른쪽(Source)에 배치

const STATUS_LABEL = {
  READY: '대기',
  RUNNING: '진행중',
  DONE: '완료',
  BLOCKED: '중단',
}

export default function CanvasNode({ data, selected }) {
  const { name, processType, status, colorScheme, description, inputs = [], outputs = [] } = data

  return (
    <div className={`flowmat-node scheme-${colorScheme}${selected ? ' is-selected' : ''}`}>
      <div className="flowmat-node__header">
        <span className="flowmat-node__type">{processType}</span>
        <span className={`flowmat-node__status status-${status?.toLowerCase()}`}>
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>

      <div className="flowmat-node__title">{name}</div>
      {description && <div className="flowmat-node__desc">{description}</div>}

      <div className="flowmat-node__ports">
        <div className="flowmat-node__port-col">
          {inputs.map((port, i) => (
            <div className="flowmat-node__port" key={port.id} style={{ position: 'relative' }}>
              <Handle
                type="target"
                position={Position.Left}
                id={port.handleId}
                style={{ top: 8 + i * 26 }}
              />
              <span className="flowmat-node__port-label" title={`${port.quantity} ${port.unit}`}>
                {port.name}
              </span>
            </div>
          ))}
        </div>

        <div className="flowmat-node__port-col flowmat-node__port-col--out">
          {outputs.map((port, i) => (
            <div className="flowmat-node__port" key={port.id} style={{ position: 'relative' }}>
              <span className="flowmat-node__port-label" title={`${port.quantity} ${port.unit}`}>
                {port.name}
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id={port.handleId}
                style={{ top: 8 + i * 26 }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
