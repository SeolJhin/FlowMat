import { describe, expect, it } from 'vitest'
import { errorMessage, errorStatus } from './errorMessage'
import { formatQty } from './formatQty'
import { isRunOpen } from '../../pages/runs/ui/runDisplay'

describe('errorMessage', () => {
  it('uses the message of a thrown UiError object', () => {
    expect(errorMessage({ httpStatus: 400, message: 'Planned output cannot exceed 1000.', kind: 'validation' })).toBe(
      'Planned output cannot exceed 1000.',
    )
  })

  it('falls back for blank messages and non-objects', () => {
    expect(errorMessage({ message: '   ' }, 'fallback')).toBe('fallback')
    expect(errorMessage('boom', 'fallback')).toBe('fallback')
    expect(errorMessage(null)).toBe('Something went wrong.')
  })
})

describe('errorStatus', () => {
  it('reads the HTTP status of a UiError', () => {
    expect(errorStatus({ httpStatus: 409, message: 'changed', kind: 'unknown' })).toBe(409)
  })

  it('returns null for anything without a numeric status', () => {
    expect(errorStatus(new Error('network'))).toBeNull()
    expect(errorStatus({ httpStatus: '409' })).toBeNull()
    expect(errorStatus(null)).toBeNull()
  })
})

describe('formatQty', () => {
  it('renders missing quantities as a dash', () => {
    expect(formatQty(null)).toBe('-')
    expect(formatQty(undefined)).toBe('-')
  })

  it('keeps up to four decimals', () => {
    expect(formatQty(0.00012345)).toBe(Number(0.0001).toLocaleString(undefined, { maximumFractionDigits: 4 }))
    expect(formatQty(0)).toBe('0')
  })
})

describe('isRunOpen', () => {
  it('treats pending and running runs as open, regardless of case', () => {
    expect(isRunOpen('running')).toBe(true)
    expect(isRunOpen('PENDING')).toBe(true)
  })

  it('treats finished and failed runs as closed', () => {
    expect(isRunOpen('finished')).toBe(false)
    expect(isRunOpen('failed')).toBe(false)
  })
})
