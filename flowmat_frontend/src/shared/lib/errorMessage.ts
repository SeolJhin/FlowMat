/** Extracts a user-facing message from a thrown UiError (or any unknown error). */
export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message: unknown }).message
    if (typeof message === 'string' && message.trim().length > 0) return message
  }
  return fallback
}

/** HTTP status of a thrown UiError, or null for anything else (network failures, programming errors). */
export function errorStatus(error: unknown): number | null {
  if (typeof error === 'object' && error !== null && 'httpStatus' in error) {
    const status = (error as { httpStatus: unknown }).httpStatus
    if (typeof status === 'number') return status
  }
  return null
}
