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

// Raw DTOs from the backend.

export interface ProjectSummaryDto {
  projectId: string
  projectName: string
  projectStatus: string
}

export interface ProjectDto {
  projectId: string
  projectName: string
  projectDesc: string | null
  projectStatus: string
  visibility: string
  currentWorkflowId: string | null
}

export interface WorkflowDto {
  workflowId: string
  projectId: string
  workflowName: string
  workflowDesc: string | null
  workflowType: string
  workflowStatus: string
}

export interface ItemDto {
  itemId: string
  projectId: string
  itemCode: string
  itemName: string
  itemType: string
  resourceCategory: string | null
  resourceType: string | null
  unitId: string | null
  itemStatus: string
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
  version: number
  versionNonce: number
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
  projectId: string
  workflowId: string
  fromProcessId: string
  toProcessId: string
  fromIoId: string | null
  toIoId: string | null
  itemId?: string | null
  sourceHandle: string
  targetHandle: string
  connectionType: string
  connectionLabel: string | null
  flowRate: number | null
  unit: string | null
  delayTimeSec: number | null
  lossRate: number | null
  priority: number | null
  version: number
  versionNonce: number
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
  ruleName: string
  ruleDesc: string | null
  conditionType: string
  conditionExpression: string
  actionType: string
  actionConfig: string
  priority: number
  enabledYn: string
}

export interface ProcessTemplateDto {
  templateId: string
  templateName: string
  templateCategory: string
  templateType: string
  iconKey: string | null
  defaultColorScheme: string
  defaultWidth: number | null
  defaultHeight: number | null
  defaultDesc: string | null
  defaultConfig: string | null
  publicYn: string
  sortOrder: number | null
}
