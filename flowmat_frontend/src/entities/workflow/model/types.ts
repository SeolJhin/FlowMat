// ── View Models (what components consume) ────────────────────────────────────

export interface WorkflowHeaderViewModel {
  workflowId: string
  projectId: string
  workflowName: string
  workflowDesc: string | null
  workflowType: string
  workflowStatus: string
}

export interface CanvasPortViewModel {
  id: string
  processIoId: string
  processId: string
  itemId: string | null
  name: string
  direction: 'input' | 'output'
  ioType: string
  quantity: string
  unit: string | null
  formula: string | null
  colorScheme: string
  required: boolean
  allowShortage: boolean
  handleId: string
}

export interface CanvasNodeViewModel {
  id: string
  processId: string
  projectId: string
  workflowId: string
  name: string
  processType: string
  nodeType: string
  status: string
  colorScheme: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  description: string | null
  inputs: CanvasPortViewModel[]
  outputs: CanvasPortViewModel[]
  inputCount: number
  outputCount: number
}

export interface CanvasEdgeViewModel {
  id: string
  connectionId: string
  source: string
  target: string
  sourceHandle: string
  targetHandle: string
  fromProcessId: string
  toProcessId: string
  fromIoId: string | null
  toIoId: string | null
  itemId?: string | null
  connectionType: string
  label: string | null
  flowRate: string | null
  unit: string | null
  delayTimeSec: number | null
  lossRate: number | null
  priority: number | null
}

export interface WorkflowCanvasViewModel {
  workflow: WorkflowHeaderViewModel
  nodes: CanvasNodeViewModel[]
  edges: CanvasEdgeViewModel[]
  nodeMap: Record<string, CanvasNodeViewModel>
  portMap: Record<string, CanvasPortViewModel>
}

// ── Mutation input types ─────────────────────────────────────────────────────

export interface UpdateProcessInput {
  processId: string
  processName?: string
  colorScheme?: string
  processDesc?: string
  processStatus?: string
  posX?: number
  posY?: number
  width?: number
  height?: number
}

export interface CreateProcessIoInput {
  processId: string
  ioName: string
  direction: 'input' | 'output'
  ioType: string
  quantity?: number
  unit?: string
  formula?: string
  colorScheme?: string
  requiredYn?: 'Y' | 'N'
  allowShortageYn?: 'Y' | 'N'
}

export interface UpdateProcessIoInput extends Partial<Omit<CreateProcessIoInput, 'processId'>> {
  processIoId: string
}

export interface UpdateProcessConnectionInput {
  connectionId: string
  connectionLabel?: string
  connectionType?: string
  flowRate?: number | null
  unit?: string | null
  delayTimeSec?: number | null
  lossRate?: number | null
  priority?: number | null
}

export type CanvasMode = 'select' | 'connect'

export interface ConnectionDraftState {
  fromProcessId: string
  fromIoId: string | null
  sourceHandle: string
}

export interface ConnectStartPayload {
  processId: string
  ioId: string | null
  handleId: string
}

export interface ConnectCompletePayload {
  fromProcessId: string
  toProcessId: string
  fromIoId: string | null
  toIoId: string | null
  sourceHandle: string
  targetHandle: string
}

export interface RuleTargetInput {
  projectId: string
  targetType: string
  targetId: string
}

export interface FlowRuleViewModel {
  ruleId: string
  projectId: string
  targetType: string
  targetId: string
  ruleType: string
  ruleValue: string | null
  ruleDesc: string | null
}
