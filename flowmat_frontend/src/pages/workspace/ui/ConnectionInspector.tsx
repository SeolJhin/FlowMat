import { useEffect, useRef, useState } from 'react'
import type {
  CanvasEdgeViewModel,
  FlowRuleViewModel,
  UpdateProcessConnectionInput,
  RuleTargetInput,
} from '../../../entities/workflow/model/types'

interface Props {
  edge: CanvasEdgeViewModel | null
  rules: FlowRuleViewModel[]
  onSubmit(input: UpdateProcessConnectionInput): Promise<void>
  onDelete(connectionId: string): Promise<void>
  onOpenRuleBuilder(target: RuleTargetInput): void
  focusLabel?: boolean
}

const CONNECTION_TYPE_OPTIONS = [
  'material', 'material_flow', 'fluid_flow', 'energy_flow',
  'data_flow', 'event_flow', 'control_flow', 'human_flow', 'equipment_flow',
]

export function ConnectionInspector({ edge, onSubmit, onDelete, focusLabel }: Props) {
  const labelRef = useRef<HTMLInputElement>(null)
  const [label, setLabel] = useState('')
  const [connectionType, setConnectionType] = useState('material')
  const [flowRate, setFlowRate] = useState('')
  const [unit, setUnit] = useState('')
  const [delayTimeSec, setDelayTimeSec] = useState('')
  const [lossRate, setLossRate] = useState('')
  const [priority, setPriority] = useState('')

  useEffect(() => {
    if (focusLabel) setTimeout(() => labelRef.current?.focus(), 50)
  }, [focusLabel, edge?.id])

  useEffect(() => {
    if (!edge) return
    setLabel(edge.label ?? '')
    setConnectionType(edge.connectionType ?? 'material')
    setFlowRate(edge.flowRate ?? '')
    setUnit(edge.unit ?? '')
    setDelayTimeSec(edge.delayTimeSec !== null ? String(edge.delayTimeSec) : '')
    setLossRate(edge.lossRate !== null ? String(edge.lossRate) : '')
    setPriority(edge.priority !== null ? String(edge.priority) : '')
  }, [edge])

  if (!edge) return null

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    await onSubmit({
      connectionId: edge!.id,
      connectionLabel: label.trim() || null,
      connectionType: connectionType.trim(),
      flowRate: flowRate !== '' ? Number(flowRate) : null,
      unit: unit.trim() || null,
      delayTimeSec: delayTimeSec !== '' ? Number(delayTimeSec) : null,
      lossRate: lossRate !== '' ? Number(lossRate) : null,
      priority: priority !== '' ? Number(priority) : null,
    })
  }

  return (
    <div className="inspector">
      <h3 className="inspector__title">{edge.label || 'Connection'}</h3>
      <dl className="inspector__fields">
        <dt>From</dt>
        <dd style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{edge.fromProcessId}</dd>
        <dt>To</dt>
        <dd style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{edge.toProcessId}</dd>
      </dl>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '10px', marginTop: '16px' }}>
        <label style={{ display: 'grid', gap: '4px' }}>
          <span>Label</span>
          <input ref={labelRef} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="(none)" />
        </label>

        <label style={{ display: 'grid', gap: '4px' }}>
          <span>Connection Type</span>
          <select value={connectionType} onChange={(e) => setConnectionType(e.target.value)}>
            {CONNECTION_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <label style={{ display: 'grid', gap: '4px' }}>
            <span>Flow Rate</span>
            <input type="number" step="0.01" value={flowRate}
              onChange={(e) => setFlowRate(e.target.value)} placeholder="—" />
          </label>
          <label style={{ display: 'grid', gap: '4px' }}>
            <span>Unit</span>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="—" />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <label style={{ display: 'grid', gap: '4px' }}>
            <span>Delay (s)</span>
            <input type="number" step="0.1" value={delayTimeSec}
              onChange={(e) => setDelayTimeSec(e.target.value)} placeholder="0" />
          </label>
          <label style={{ display: 'grid', gap: '4px' }}>
            <span>Loss %</span>
            <input type="number" step="0.01" min="0" max="1" value={lossRate}
              onChange={(e) => setLossRate(e.target.value)} placeholder="0" />
          </label>
          <label style={{ display: 'grid', gap: '4px' }}>
            <span>Priority</span>
            <input type="number" step="1" value={priority}
              onChange={(e) => setPriority(e.target.value)} placeholder="0" />
          </label>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="submit">Save</button>
          <button
            type="button"
            onClick={() => void onDelete(edge.id)}
            style={{ border: '1px solid #fca5a5', color: '#991b1b', background: '#fef2f2' }}
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  )
}
