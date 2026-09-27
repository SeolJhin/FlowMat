import type { PickListInput, PickListLine, PutawayInput, WarehouseTaskDto } from '../../../entities/inventory/api/useWarehouseTasks'
import type { InventoryDto, WorkOrderDto } from '../../../shared/types/api'

/** What of a record is not already planned in open tasks; the server checks the same. */
export function freeToMove(record: InventoryDto, openTasks: WarehouseTaskDto[]): number {
  const planned = openTasks
    .filter((task) => task.status === 'open' && task.inventoryId === record.inventoryId)
    .reduce((sum, task) => sum + task.quantity, 0)
  return Math.max(0, Number(record.availableQuantity) - planned)
}

/** Records a putaway can take from: available status with something free, grouped by item then place. */
export function movableRecords(
  records: InventoryDto[],
  openTasks: WarehouseTaskDto[],
  itemLabel: (itemId: string) => string,
): InventoryDto[] {
  return records
    .filter((record) => record.inventoryStatus === 'available' && freeToMove(record, openTasks) > 0)
    .sort((left, right) => itemLabel(left.itemId).localeCompare(itemLabel(right.itemId))
      || (left.location ?? '').localeCompare(right.location ?? ''))
}

/** Orders a pick list can be made for: approved or started, with a BOM and a target quantity. */
export function pickableOrders(orders: WorkOrderDto[]): WorkOrderDto[] {
  return orders.filter((order) => (order.workOrderStatus === 'approved' || order.workOrderStatus === 'in_progress')
    && order.bomId !== null && order.targetQuantity !== null)
}

export interface PutawayForm {
  inventoryId: string
  quantity: string
  toLocation: string
  note: string
}

export const EMPTY_PUTAWAY: PutawayForm = { inventoryId: '', quantity: '', toLocation: '', note: '' }

export function putawayPayload(
  form: PutawayForm,
  record: InventoryDto | undefined,
  free: number,
): { input: PutawayInput; error: null } | { input: null; error: string } {
  if (!record) return { input: null, error: 'Pick a stock record.' }
  const quantity = Number(form.quantity)
  if (!form.quantity.trim() || !Number.isFinite(quantity) || quantity <= 0) return { input: null, error: 'Enter a quantity above 0.' }
  if (quantity > free) return { input: null, error: `Only ${free} of this record is free to move.` }
  const to = form.toLocation.trim()
  if (!to) return { input: null, error: 'Say where the stock goes.' }
  if (to.toLowerCase() === (record.location ?? '').trim().toLowerCase()) return { input: null, error: 'The stock is already there.' }
  return { input: { inventoryId: record.inventoryId, quantity, toLocation: to, note: form.note.trim() || null }, error: null }
}

export interface PickForm {
  mode: 'order' | 'items'
  stagingLocation: string
  workOrderId: string
  quantity: string
  lines: { itemId: string; quantity: string }[]
  note: string
}

export const EMPTY_PICK: PickForm = {
  mode: 'order', stagingLocation: '', workOrderId: '', quantity: '', lines: [{ itemId: '', quantity: '' }], note: '',
}

export function pickPayload(form: PickForm): { input: PickListInput; error: null } | { input: null; error: string } {
  const staging = form.stagingLocation.trim()
  if (!staging) return { input: null, error: 'Say where to pick to.' }
  const note = form.note.trim() || null
  if (form.mode === 'order') {
    if (!form.workOrderId) return { input: null, error: 'Pick a work order.' }
    if (!form.quantity.trim()) return { input: { stagingLocation: staging, workOrderId: form.workOrderId, note }, error: null }
    const quantity = Number(form.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) return { input: null, error: 'The quantity to pick for must be above 0.' }
    return { input: { stagingLocation: staging, workOrderId: form.workOrderId, quantity, note }, error: null }
  }
  const lines = form.lines.filter((line) => line.itemId || line.quantity.trim())
  if (lines.length === 0) return { input: null, error: 'Add an item to pick.' }
  const parsed: { itemId: string; quantity: number }[] = []
  for (const line of lines) {
    const quantity = Number(line.quantity)
    if (!line.itemId || !line.quantity.trim() || !Number.isFinite(quantity) || quantity <= 0) {
      return { input: null, error: 'Every line needs an item and a quantity above 0.' }
    }
    parsed.push({ itemId: line.itemId, quantity })
  }
  return { input: { stagingLocation: staging, lines: parsed, note }, error: null }
}

/** e.g. "Short: FLOUR 4, SALT 0.2"; empty when everything could be planned. */
export function shortageText(lines: PickListLine[]): string {
  const short = lines.filter((line) => line.shortage > 0)
  return short.length === 0 ? '' : `Short: ${short.map((line) => `${line.itemCode} ${line.shortage}`).join(', ')}`
}
