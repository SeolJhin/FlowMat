/** A stock measurement must fit the database's nonnegative numeric(14,4) quantity. */
export function countPlanQuantity(value: string): number {
  const text = value.trim()
  if (!text) throw new Error('Enter the physically counted quantity.')
  if (!/^\d+(?:\.\d{1,4})?$/.test(text)) throw new Error('Use a nonnegative quantity with at most four decimal places.')
  const quantity = Number(text)
  if (!Number.isFinite(quantity) || quantity > 9999999999.9999) throw new Error('The counted quantity is too large.')
  return quantity
}
