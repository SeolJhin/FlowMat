import type { ItemDto } from '../../../shared/types/api'
import type { CanvasPortViewModel, CreateProcessIoInput, UpdateProcessIoInput } from './types'

export interface PortFormState {
  processIoId: string | null
  itemId: string
  ioName: string
  direction: 'input' | 'output'
  ioType: string
  role: string
  resourceType: string
  schemaJson: string
  validationRule: string
  quantity: string
  unit: string
  formula: string
  colorScheme: string
  requiredYn: 'Y' | 'N'
  allowShortageYn: 'Y' | 'N'
}

const DEFAULT_DIRECTION: PortFormState['direction'] = 'input'
const DEFAULT_IO_TYPE = 'material'
const DEFAULT_COLOR_BY_DIRECTION: Record<PortFormState['direction'], string> = {
  input: 'sky',
  output: 'emerald',
}

export function createDefaultPortFormState(direction: PortFormState['direction'] = DEFAULT_DIRECTION): PortFormState {
  return {
    processIoId: null,
    itemId: '',
    ioName: '',
    direction,
    ioType: DEFAULT_IO_TYPE,
    role: '',
    resourceType: DEFAULT_IO_TYPE,
    schemaJson: '',
    validationRule: '',
    quantity: '0',
    unit: '',
    formula: '',
    colorScheme: DEFAULT_COLOR_BY_DIRECTION[direction],
    requiredYn: 'Y',
    allowShortageYn: 'N',
  }
}

export function toPortFormState(port: CanvasPortViewModel): PortFormState {
  return {
    processIoId: port.processIoId,
    itemId: port.itemId ?? '',
    ioName: port.name,
    direction: port.direction,
    ioType: port.ioType,
    role: port.role ?? '',
    resourceType: port.resourceType,
    schemaJson: port.schemaJson ? JSON.stringify(port.schemaJson, null, 2) : '',
    validationRule: port.validationRule ?? '',
    quantity: port.quantity || '0',
    unit: port.unit ?? '',
    formula: port.formula ?? '',
    colorScheme: port.colorScheme,
    requiredYn: port.required ? 'Y' : 'N',
    allowShortageYn: port.allowShortage ? 'Y' : 'N',
  }
}

export function applyItemDefaults(state: PortFormState, item: ItemDto | undefined): PortFormState {
  if (!item) return state
  return {
    ...state,
    itemId: item.itemId,
    ioName: state.ioName || item.itemName,
    unit: state.unit || item.unitId || '',
  }
}

export function toCreateProcessIoInput(processId: string, state: PortFormState): CreateProcessIoInput {
  return {
    processId,
    itemId: state.itemId,
    ioName: state.ioName.trim(),
    direction: state.direction,
    ioType: state.ioType.trim().toLowerCase(),
    role: normalizeOptionalText(state.role),
    resourceType: state.resourceType.trim().toLowerCase(),
    schemaJson: parseSchemaJson(state.schemaJson),
    validationRule: normalizeOptionalText(state.validationRule),
    quantity: normalizeQuantity(state.quantity),
    unit: state.unit.trim(),
    formula: normalizeOptionalText(state.formula),
    colorScheme: state.colorScheme.trim().toLowerCase(),
    requiredYn: state.requiredYn,
    allowShortageYn: state.allowShortageYn,
  }
}

export function toUpdateProcessIoInput(state: PortFormState): UpdateProcessIoInput {
  return {
    processIoId: state.processIoId ?? '',
    itemId: state.itemId,
    ioName: state.ioName.trim(),
    direction: state.direction,
    ioType: state.ioType.trim().toLowerCase(),
    role: normalizeOptionalText(state.role),
    resourceType: state.resourceType.trim().toLowerCase(),
    schemaJson: parseSchemaJson(state.schemaJson),
    validationRule: normalizeOptionalText(state.validationRule),
    quantity: normalizeQuantity(state.quantity),
    unit: state.unit.trim(),
    formula: normalizeOptionalText(state.formula),
    colorScheme: state.colorScheme.trim().toLowerCase(),
    requiredYn: state.requiredYn,
    allowShortageYn: state.allowShortageYn,
  }
}

export function hasValidPortSelection(state: PortFormState): boolean {
  return Boolean(state.itemId.trim()) && Boolean(state.unit.trim()) && Boolean(state.resourceType.trim())
    && !Number.isNaN(Number(state.quantity)) && isValidSchemaJson(state.schemaJson)
}

export function isValidSchemaJson(value: string): boolean {
  if (!value.trim()) return true
  try {
    const parsed: unknown = JSON.parse(value)
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
  } catch {
    return false
  }
}

function parseSchemaJson(value: string): Record<string, unknown> | undefined {
  if (!value.trim()) return undefined
  const parsed: unknown = JSON.parse(value)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Port schema must be a JSON object.')
  }
  return parsed as Record<string, unknown>
}

function normalizeQuantity(value: string): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function normalizeOptionalText(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}
