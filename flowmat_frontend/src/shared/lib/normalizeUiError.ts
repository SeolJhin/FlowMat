import type { UiError } from '../types/api'

export function normalizeUiError(httpStatus: number, message: string): UiError {
  let kind: UiError['kind']

  if (httpStatus === 400) kind = 'validation'
  else if (httpStatus === 404) kind = 'not_found'
  else if (httpStatus === 403) kind = 'forbidden'
  else kind = 'unknown'

  return { httpStatus, message, kind }
}
