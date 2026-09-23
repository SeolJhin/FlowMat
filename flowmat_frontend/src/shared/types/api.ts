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

export interface UserDto {
  id: string
  userId: string
  userName: string
  userEmail: string
  userStatus: string
}

export interface UserPermissionDto {
  canManageUsers: boolean
  canManageTemplates: boolean
  canManageMasterData: boolean
}

export interface UnitDto {
  unitId: string
  unitCode: string
  unitName: string
  unitType: string
  baseUnitCode: string | null
  conversionRate: number
  activeYn: string
}

export interface ProductionRunDto {
  productionRunId: string
  projectId: string
  workflowId: string
  runNumber: string
  runType: string | null
  runStatus: string
  targetItemId: string | null
  plannedOutputQty: number
  actualOutputQty: number | null
  workOrderId: string | null
}

export type WorkOrderStatus = 'draft' | 'approved' | 'in_progress' | 'completed' | 'cancelled'

export interface WorkOrderDto {
  workOrderId: string
  projectId: string
  workflowId: string | null
  workOrderNumber: string
  workOrderTitle: string
  workOrderStatus: WorkOrderStatus
  priority: string
  targetItemId: string | null
  targetQuantity: number | null
  plannedStartAt: string | null
  plannedEndAt: string | null
  actualStartAt: string | null
  actualEndAt: string | null
  instruction: string | null
  assignedTo: string | null
  approvedBy: string | null
  approvedAt: string | null
  producedQuantity: number
  runCount: number
}

export interface ProductionRunItemDto {
  productionRunItemId: string
  productionRunId: string
  processId: string | null
  processIoId: string | null
  inventoryId: string | null
  itemId: string
  direction: string
  plannedQty: number
  actualQty: number | null
  unit: string
}

export interface InventoryDto {
  inventoryId: string
  projectId: string
  itemId: string
  quantity: number
  reservedQuantity: number
  availableQuantity: number
  inventoryStatus: string
  location: string | null
  minThreshold: number | null
  maxThreshold: number | null
  stockLevel: 'low' | 'ok' | 'over'
  /** Optimistic-lock version; send it back as expectedVersion when adjusting. */
  version: number | null
}

export interface ProjectInvitePreviewDto {
  projectName: string
  projectRole: string
  inviterName: string | null
  invitedEmailMasked: string | null
  inviteStatus: string
  expiredAt: string | null
  expired: boolean
  addressedToCurrentUser: boolean
}

export interface InventoryTransactionDto {
  inventoryTransactionId: string
  inventoryId: string
  projectId: string
  itemId: string
  transactionType: string
  quantityDelta: number
  reservedDelta: number
  availableDelta: number
  quantityAfter: number
  reservedAfter: number
  availableAfter: number
  referenceType: string | null
  referenceId: string | null
  note: string | null
  createdBy: string | null
  createdAt: string | null
  lotId: string | null
  /** Idempotency key sent with the movement; null for rows written before V17. */
  requestId: string | null
}

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

export interface CanvasAnnotationDto {
  annotationId: string
  workflowId: string
  projectId: string
  annotationType: 'shape' | 'freehand' | 'text'
  shapeKind: 'rectangle' | 'ellipse' | 'diamond' | null
  posX: number
  posY: number
  width: number | null
  height: number | null
  rotation: number | null
  points: number[][] | null
  textContent: string | null
  style: Record<string, unknown> | null
  zIndex: string
  groupId: string | null
  lockedYn: 'Y' | 'N'
  version: number
  versionNonce: number
}

export interface GraphEntityPayloadDto {
  workflow: WorkflowDto | null
  process: ProcessDto | null
  processIos: ProcessIoDto[]
  connection: ProcessConnectionDto | null
  annotation: CanvasAnnotationDto | null
}

export interface WorkflowGraphChangeDto {
  seq: number
  changeType: string
  workflowId: string
  entityId: string
  userId: string | null
  timestamp: number
  payload: GraphEntityPayloadDto | null
}

export interface WorkflowGraphChangesDto {
  currentSeq: number
  resetRequired: boolean
  changes: WorkflowGraphChangeDto[]
}

export interface WorkflowCanvasDto {
  workflow: WorkflowDto
  graphSeq: number
  processes: ProcessDto[]
  processIos: ProcessIoDto[]
  connections: ProcessConnectionDto[]
  annotations: CanvasAnnotationDto[]
  currentUserRole: 'viewer' | 'editor' | 'owner'
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

export interface ProjectMemberDto {
  projectMemberId: string
  projectId: string
  userId: string
  projectRole: string
  memberStatus: string
  joinedAt: string | null
}

export interface ProjectInviteDto {
  inviteId: string
  projectId: string
  invitedEmail: string
  invitedUserId: string | null
  projectRole: string
  inviteStatus: string
  inviteToken: string
  acceptedAt: string | null
  expiredAt: string | null
}

export interface RoleDto {
  roleId: string
  roleName: string
  roleDescription: string | null
}

export interface UserRoleDto {
  userRolesId: string
  userId: string
  roleId: string
  roleName: string
  scopeType: string
  grantedAt: string | null
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
