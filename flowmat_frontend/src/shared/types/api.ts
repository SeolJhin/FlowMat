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
  workflowRevisionId: string | null
  runNumber: string
  runType: string | null
  runStatus: string
  targetItemId: string | null
  plannedOutputQty: number
  actualOutputQty: number | null
  workOrderId: string | null
  /** BOM revision frozen onto the run at start, if any. */
  bomId: string | null
  bomVersion: number | null
}

export interface WorkflowRevisionDto {
  workflowRevisionId: string
  workflowId: string
  revisionNo: number
  status: 'published' | 'retired'
  schemaVersion: number
  publishedBy: string
  publishedAt: string
  retiredBy: string | null
  retiredAt: string | null
}

export interface WorkflowRevisionDetailDto extends WorkflowRevisionDto {
  snapshot: unknown
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
  bomId: string | null
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
  /**
   * "manual" when recorded by hand, "bom" when planned from the BOM snapshot at run start, "correction" when added by a
   * finished-run correction.
   */
  quantitySource: string | null
  conversionRate: number | null
  lotId: string | null
  /** A cancelled recording: its stock movement was reversed and it no longer counts. */
  cancelled: boolean
  cancelledBy: string | null
  cancelledAt: string | null
  cancelReason: string | null
  /** The correction that added this recording. */
  productionRunCorrectionId?: string | null
  /** The correction that voided this recording (null when it was cancelled on the open run). */
  cancelledByCorrectionId?: string | null
}

export type ReadinessCheckStatus = 'ok' | 'warn' | 'fail'

/** Whether a work order can run now (docs/domain/work-order-readiness.md). Nothing is reserved by checking. */
export interface WorkOrderReadinessDto {
  workOrderId: string
  /** No check failed; warnings do not block. */
  ready: boolean
  /** Target minus what finished runs produced; null without a target quantity. */
  remainingQuantity: number | null
  checks: { code: string; status: ReadinessCheckStatus; message: string }[]
  materials: {
    itemId: string
    itemCode: string
    itemName: string | null
    requiredQuantity: number
    unit: string
    availableQuantity: number
    shortageQuantity: number
    lotTracked: boolean
    usableLots: number
  }[]
}

export type RunCorrectionStatus = 'pending_approval' | 'applied' | 'rejected'
export type RunCorrectionKind = 'void_item' | 'add_item' | 'set_output_qty'

export interface RunCorrectionLineDto {
  lineNo: number
  kind: RunCorrectionKind
  targetRunItemId: string | null
  direction: string | null
  itemId: string | null
  inventoryId: string | null
  qty: number | null
  unit: string | null
  beforeQty: number | null
  afterQty: number | null
  createdRunItemId: string | null
}

/** A correction of a finished run (docs/domain/production-run-correction.md). */
export interface RunCorrectionDto {
  productionRunCorrectionId: string
  productionRunId: string
  correctionNo: number
  status: RunCorrectionStatus
  reason: string
  requestedBy: string
  requestedAt: string
  decidedBy: string | null
  decidedAt: string | null
  decisionNote: string | null
  appliedAt: string | null
  lines: RunCorrectionLineDto[]
}

/** One change in a correction request. */
export type RunCorrectionLineRequest =
  | { kind: 'void_item'; targetRunItemId: string }
  | { kind: 'add_item'; direction: 'input' | 'output'; itemId: string; inventoryId: string | null; qty: number; unit: string }
  | { kind: 'set_output_qty'; afterQty: number }

export type InspectionResult = 'pass' | 'fail'
export type DefectSeverity = 'minor' | 'major' | 'critical'

/** A recorded inspection (docs/domain/quality-inspection.md). Never edited; a new one follows a wrong one. */
export interface QualityInspectionDto {
  inspectionId: string
  projectId: string
  productionRunId: string | null
  runNumber: string | null
  itemId: string | null
  itemCode: string | null
  itemName: string | null
  lotId: string | null
  lotNo: string | null
  /** The LOT's status now, not at inspection time. */
  lotStatus: string | null
  inspectionType: string
  resultStatus: InspectionResult
  measuredValue: number | null
  standardMin: number | null
  standardMax: number | null
  unit: string | null
  note: string | null
  inspectedBy: string
  inspectedAt: string
}

export interface QualityInspectionCreateRequest {
  projectId: string
  productionRunId?: string | null
  lotId?: string | null
  itemId?: string | null
  inspectionType: string
  /** Worked out by the server when a measured value and a limit are given. */
  result?: InspectionResult | null
  measuredValue?: number | null
  standardMin?: number | null
  standardMax?: number | null
  unit?: string | null
  note?: string | null
  /** Failed inspections of a LOT only: quarantine the whole LOT in the same request. */
  quarantineLot?: boolean
}

/** A logged defect; logging one moves no stock. */
export interface DefectDto {
  defectLogId: string
  projectId: string
  inspectionId: string | null
  productionRunId: string | null
  runNumber: string | null
  itemId: string
  itemCode: string | null
  itemName: string | null
  lotId: string | null
  lotNo: string | null
  defectType: string
  quantity: number
  /** The item's unit. */
  unit: string | null
  severity: DefectSeverity
  reason: string | null
  resolved: boolean
  actionTaken: string | null
  loggedBy: string
  loggedAt: string
  resolvedBy: string | null
  resolvedAt: string | null
}

export interface DefectCreateRequest {
  projectId: string
  inspectionId?: string | null
  productionRunId?: string | null
  lotId?: string | null
  itemId?: string | null
  quantity: number
  defectType: string
  severity?: DefectSeverity
  reason?: string | null
}

/** A BOM revision that uses an item as a line (where-used). */
export interface BomWhereUsedDto {
  bomId: string
  bomName: string
  bomVersion: number
  bomStatus: string
  targetItemId: string
  targetItemCode: string | null
  targetItemName: string | null
  baseQuantity: number
  baseUnit: string
  bomLineId: string
  lineQuantity: number
  lineUnit: string
  scrapRate: number | null
}

/** A stock row outside its thresholds (docs/domain/stock-alert.md); it closes by itself when the row is back inside. */
export interface StockAlertDto {
  stockAlertId: string
  projectId: string
  inventoryId: string
  itemId: string
  itemCode: string | null
  itemName: string | null
  location: string | null
  lotNo: string | null
  /**
   * low: available below the minimum. over: on hand above the maximum. expiry: stock of a LOT expiring within the warning
   * window (threshold = window in days, actual = days left, negative once expired).
   */
  alertType: 'low' | 'over' | 'expiry'
  severity: 'critical' | 'warning' | 'info'
  thresholdValue: number
  /** The latest value while open. */
  actualValue: number
  unit: string | null
  message: string | null
  resolved: boolean
  triggeredAt: string
  resolvedAt: string | null
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
  lotId: string | null
  lotNo: string | null
}

export type BomStatus = 'draft' | 'pending_approval' | 'approved' | 'retired'

export interface BomLineDto {
  bomLineId: string
  childItemId: string
  quantity: number
  unit: string
  scrapRate: number | null
  optionalYn: string | null
  substituteGroup: string | null
  sortOrder: number | null
  note: string | null
}

/** One BOM revision. Only drafts can change; a change to an approved BOM is a new revision. */
export interface BomDto {
  bomId: string
  projectId: string
  targetItemId: string
  bomName: string
  bomVersion: number
  baseQuantity: number
  baseUnit: string
  bomStatus: BomStatus
  approvedBy: string | null
  approvedAt: string | null
  note: string | null
  lines: BomLineDto[]
}

export interface BomRequirementLineDto {
  bomLineId: string
  childItemId: string
  lineQuantity: number
  lineUnit: string
  requiredQuantity: number
  itemUnit: string
  requiredItemQuantity: number
  conversionRate: number
}

export interface BomRequirementDto {
  bomId: string
  bomVersion: number
  targetItemId: string
  productionQuantity: number
  baseQuantity: number
  lines: BomRequirementLineDto[]
}

export type LotStatus = 'available' | 'reserved' | 'quarantined' | 'consumed' | 'closed'

export interface LotDto {
  lotId: string
  projectId: string
  itemId: string
  lotNo: string
  serialNo: string | null
  lotStatus: LotStatus
  receivedAt: string | null
  producedAt: string | null
  expiryDate: string | null
  productionRunId: string | null
  quantityOnHand: number
  quantityReserved: number
  /** Past its expiry date today (docs/domain/lot-expiry.md): cannot go into production or be reserved. */
  expired?: boolean
}

export interface LotTraceNodeDto {
  lot: LotDto
  depth: number
  viaLotId: string
  productionRunId: string | null
  consumedQty: number | null
  producedQty: number | null
  unit: string | null
}

export interface LotTraceDto {
  lot: LotDto
  direction: 'backward' | 'forward'
  nodes: LotTraceNodeDto[]
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
  /** "Y" when stock of this item is tracked per LOT. */
  lotManageYn: string | null
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
  role: string | null
  resourceType: string
  schemaJson: Record<string, unknown> | null
  validationRule: string | null
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
  conditionExpr: string | null
  capacity: number | null
  failurePolicy: 'stop' | 'skip' | 'retry'
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
