import type { ItemDto } from '../../../shared/types/api'
import type { CanvasPortViewModel, CreateProcessIoInput, UpdateProcessIoInput } from './types'

export interface PortFormState {
  processIoId: string | null
  itemId: string
  ioName: string
  direction: 'input' | 'output'
  ioType: string
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
    quantity: normalizeQuantity(state.quantity),
    unit: state.unit.trim(),
    formula: normalizeOptionalText(state.formula),
    colorScheme: state.colorScheme.trim().toLowerCase(),
    requiredYn: state.requiredYn,
    allowShortageYn: state.allowShortageYn,
  }
}

export function hasValidPortSelection(state: PortFormState): boolean {
  return Boolean(state.itemId.trim()) && Boolean(state.unit.trim()) && !Number.isNaN(Number(state.quantity))
}

function normalizeQuantity(value: string): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function normalizeOptionalText(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}
