import type { ItemDetailsDto } from '../../../shared/types/api'

/** The item's descriptive fields as typed in the form: empty when not recorded. */
export type ItemInfoForm = Record<keyof ItemDetailsDto, string>

export const EMPTY_ITEM_INFO: ItemInfoForm = { itemGroup: '', spec: '', barcode: '', sku: '', storageCondition: '', description: '' }

/** Labels in the order the form and the detail panel show them. */
export const ITEM_INFO_LABELS: [keyof ItemDetailsDto, string][] = [
  ['itemGroup', 'Group'],
  ['spec', 'Spec'],
  ['barcode', 'Barcode'],
  ['sku', 'SKU'],
  ['storageCondition', 'Storage'],
  ['description', 'Description'],
]

export function itemInfoForm(details: ItemDetailsDto | null | undefined): ItemInfoForm {
  if (!details) return EMPTY_ITEM_INFO
  return Object.fromEntries(ITEM_INFO_LABELS.map(([key]) => [key, details[key] ?? ''])) as ItemInfoForm
}

/** The details to send. The server replaces them all, so an empty field clears it. */
export function itemInfoPayload(form: ItemInfoForm): ItemDetailsDto {
  return Object.fromEntries(ITEM_INFO_LABELS.map(([key]) => [key, form[key].trim() || null])) as unknown as ItemDetailsDto
}

/** The recorded fields with their labels, for showing an item; empty when none is recorded. */
export function itemInfoLines(details: ItemDetailsDto | null | undefined): { label: string; value: string }[] {
  if (!details) return []
  return ITEM_INFO_LABELS.filter(([key]) => details[key]).map(([key, label]) => ({ label, value: details[key] as string }))
}
