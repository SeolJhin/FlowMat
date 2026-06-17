import type { ApiEnvelope, UiError } from '../types/api'
import { normalizeUiError } from '../lib/normalizeUiError'

export function unwrapApiResponse<T>(envelope: ApiEnvelope<T>, httpStatus = 200): T {
  if (envelope.success && envelope.data !== null) {
    return envelope.data
  }

  const err: UiError = normalizeUiError(httpStatus, envelope.message ?? 'Unknown error')
  throw err
}
