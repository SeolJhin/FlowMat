/** An explicit blank clears the cost; zero is known free disposal. Mirrors numeric(14,4). */
export function disposalCostInput(text: string): { disposalCost: number | null; error: string | null } {
  const value = text.trim()
  if (!value) return { disposalCost: null, error: null }
  if (!/^(?:\d{1,10}(?:\.\d{1,4})?|\.\d{1,4})$/.test(value))
    return { disposalCost: null, error: 'Disposal cost needs a nonnegative number with at most 10 whole digits and 4 decimals.' }
  return { disposalCost: Number(value), error: null }
}

/** A disposal cost change for display: unknown stays "not set" and zero is "free" (WD7). */
export function disposalChangeText(
  change: { previousDisposalCost: number | null; disposalCost: number | null },
  format: (value: number) => string,
): string {
  const cost = (value: number | null) => (value === null ? 'not set' : value === 0 ? 'free' : format(value))
  return `${cost(change.previousDisposalCost)} → ${cost(change.disposalCost)}`
}
