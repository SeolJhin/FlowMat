/** An explicit blank clears the rate; zero stays a known rate. Mirrors numeric(14,4). */
export function hourlyCostInput(text: string): { hourlyCost: number | null; error: string | null } {
  const value = text.trim()
  if (!value) return { hourlyCost: null, error: null }
  if (!/^(?:\d{1,10}(?:\.\d{1,4})?|\.\d{1,4})$/.test(value))
    return { hourlyCost: null, error: 'Hourly equipment cost needs a nonnegative number with at most 10 whole digits and 4 decimals.' }
  return { hourlyCost: Number(value), error: null }
}
