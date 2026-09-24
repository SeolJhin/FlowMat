/**
 * Idempotency key for one user action on a stock-changing command. Generate it once per click: a resend with the
 * same key returns the first result instead of moving stock twice.
 */
export function newRequestId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `req-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
