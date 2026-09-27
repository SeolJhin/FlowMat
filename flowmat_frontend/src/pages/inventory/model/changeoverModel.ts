import type { EquipmentChangeoverDto, EquipmentChangeoverInput } from '../../../entities/catalog/api/useEquipmentChangeovers'

/** The longest changeover the server takes, a week in minutes. */
export const LONGEST_CHANGEOVER_MINUTES = 7 * 24 * 60

export interface ChangeoverForm {
  /** Empty: any item. */
  fromItemId: string
  toItemId: string
  minutes: string
  note: string
}

export const EMPTY_CHANGEOVER_FORM: ChangeoverForm = { fromItemId: '', toItemId: '', minutes: '', note: '' }

/** "45 min", "2 h", "1 h 30 min". */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

/** One side of a rule: the item, or "Any item" when open. */
export function changeoverSide(code: string | null, name: string | null): string {
  if (!code) return 'Any item'
  return name ? `${code} · ${name}` : code
}

/** A whole number of minutes the server takes, or null. */
export function parseMinutes(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null
  const minutes = Number(text.trim())
  return minutes >= 1 && minutes <= LONGEST_CHANGEOVER_MINUTES ? minutes : null
}

export function changeoverPayload(
  form: ChangeoverForm,
  rules: EquipmentChangeoverDto[],
): { input: EquipmentChangeoverInput; error: null } | { input: null; error: string } {
  const minutes = parseMinutes(form.minutes)
  if (minutes === null) return { input: null, error: `Minutes must be a whole number from 1 to ${LONGEST_CHANGEOVER_MINUTES}.` }
  const fromItemId = form.fromItemId || null
  const toItemId = form.toItemId || null
  if (rules.some((rule) => rule.fromItemId === fromItemId && rule.toItemId === toItemId)) {
    return { input: null, error: 'This pair already has a changeover; change its time instead.' }
  }
  return { input: { fromItemId, toItemId, minutes, note: form.note.trim() || null }, error: null }
}
