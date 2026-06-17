import type {
  CanvasNodeViewModel,
  CanvasPortViewModel,
  FlowRuleViewModel,
  UpdateProcessInput,
  CreateProcessIoInput,
  UpdateProcessIoInput,
  RuleTargetInput,
} from '../../../entities/workflow/model/types'

interface Props {
  node: CanvasNodeViewModel | null
  selectedPort: CanvasPortViewModel | null
  rules: FlowRuleViewModel[]
  onNodeSubmit(input: UpdateProcessInput): Promise<void>
  onPortCreate(input: CreateProcessIoInput): Promise<void>
  onPortUpdate(input: UpdateProcessIoInput): Promise<void>
  onPortDelete(processIoId: string): Promise<void>
  onOpenRuleBuilder(target: RuleTargetInput): void
}

export function NodeInspector({ node, selectedPort }: Props) {
  if (!node) return null

  return (
    <div className="inspector">
      <h3 className="inspector__title">{node.name}</h3>
      <dl className="inspector__fields">
        <dt>Type</dt>
        <dd>{node.nodeType}</dd>
        <dt>Status</dt>
        <dd>{node.status}</dd>
        <dt>Color</dt>
        <dd>{node.colorScheme}</dd>
        <dt>Position</dt>
        <dd>x {node.position.x.toFixed(0)} · y {node.position.y.toFixed(0)}</dd>
        {node.description && (
          <>
            <dt>Description</dt>
            <dd>{node.description}</dd>
          </>
        )}
      </dl>

      <section className="inspector__section">
        <h4>Inputs ({node.inputCount})</h4>
        {node.inputs.map((port) => (
          <PortRow key={port.id} port={port} selected={selectedPort?.id === port.id} />
        ))}
      </section>

      <section className="inspector__section">
        <h4>Outputs ({node.outputCount})</h4>
        {node.outputs.map((port) => (
          <PortRow key={port.id} port={port} selected={selectedPort?.id === port.id} />
        ))}
      </section>

      <p className="inspector__hint">Edit forms available in Sprint 2.</p>
    </div>
  )
}

function PortRow({ port, selected }: { port: CanvasPortViewModel; selected: boolean }) {
  return (
    <div className={`inspector__port-row ${selected ? 'inspector__port-row--selected' : ''}`}>
      <span className="inspector__port-name">{port.name}</span>
      {port.unit && <span className="inspector__port-unit">{port.unit}</span>}
      {port.required && <span className="inspector__port-badge">required</span>}
    </div>
  )
}
