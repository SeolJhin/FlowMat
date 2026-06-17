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
}

export function ConnectionInspector({ edge }: Props) {
  if (!edge) return null

  return (
    <div className="inspector">
      <h3 className="inspector__title">{edge.label ?? `Connection`}</h3>
      <dl className="inspector__fields">
        <dt>Type</dt>
        <dd>{edge.connectionType}</dd>
        <dt>From</dt>
        <dd>{edge.fromProcessId}</dd>
        <dt>To</dt>
        <dd>{edge.toProcessId}</dd>
        {edge.flowRate !== null && (
          <>
            <dt>Flow rate</dt>
            <dd>{edge.flowRate}{edge.unit ? ` ${edge.unit}` : ''}</dd>
          </>
        )}
        {edge.delayTimeSec !== null && (
          <>
            <dt>Delay</dt>
            <dd>{edge.delayTimeSec}s</dd>
          </>
        )}
        {edge.lossRate !== null && (
          <>
            <dt>Loss rate</dt>
            <dd>{edge.lossRate}</dd>
          </>
        )}
        {edge.priority !== null && (
          <>
            <dt>Priority</dt>
            <dd>{edge.priority}</dd>
          </>
        )}
      </dl>

      <p className="inspector__hint">Edit forms available in Sprint 2.</p>
    </div>
  )
}
