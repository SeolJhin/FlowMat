export type ElementId = string & { readonly __elementIdBrand: unique symbol }

export function toElementId(value: string): ElementId {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error('ElementId must not be empty.')
  }
  return trimmed as ElementId
}

export function createElementId(sequence: number, prefix = 'element'): ElementId {
  if (!Number.isInteger(sequence) || sequence < 0) {
    throw new Error('ElementId sequence must be a non-negative integer.')
  }
  if (!/^[a-z][a-z0-9-]*$/i.test(prefix)) {
    throw new Error('ElementId prefix must be alphanumeric with optional hyphens.')
  }
  return toElementId(`${prefix}-${sequence}`)
}
