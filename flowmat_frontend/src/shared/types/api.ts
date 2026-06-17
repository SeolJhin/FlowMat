export interface ApiEnvelope<T> {
  success: boolean
  data: T | null
  message: string | null
}

export type UiError = {
  httpStatus: number
  message: string
  kind: 'validation' | 'not_found' | 'forbidden' | 'unknown'
}

// ── Raw DTOs from the backend ────────────────────────────────────────────────

export interface WorkflowDto {
  workflowId: string
  projectId: string
  workflowName: string
  workflowDesc: string | null
  workflowType: string
  workflowStatus: string
}

export interface ProcessDto {
  processId: string
  projectId: string
  workflowId: string
  processName: string
  processType: string
  nodeType: string
  processStatus: string
  colorScheme: string
  posX: number
  posY: number
  width: number
  height: number
  processDesc: string | null
}

export interface ProcessIoDto {
  processIoId: string
  processId: string
  itemId: string | null
  ioName: string
  direction: 'input' | 'output'
  ioType: string
  quantity: number | null
  unit: string | null
  formula: string | null
  colorScheme: string
  requiredYn: 'Y' | 'N'
  allowShortageYn: 'Y' | 'N'
}

export interface ProcessConnectionDto {
  connectionId: string
  fromProcessId: string
  toProcessId: string
  fromIoId: string | null
  toIoId: string | null
  sourceHandle: string
  targetHandle: string
  connectionType: string
  connectionLabel: string | null
  flowRate: number | null
  unit: string | null
  delayTimeSec: number | null
  lossRate: number | null
  priority: number | null
}

export interface WorkflowCanvasDto {
  workflow: WorkflowDto
  processes: ProcessDto[]
  processIos: ProcessIoDto[]
  connections: ProcessConnectionDto[]
}

export interface FlowRuleDto {
  ruleId: string
  projectId: string
  targetType: string
  targetId: string
  ruleType: string
  ruleValue: string | null
  ruleDesc: string | null
}

export interface ProcessTemplateDto {
  templateId: string
  templateName: string
  category: string
  nodeType: string
  colorScheme: string
  description: string | null
  icon: string | null
}
