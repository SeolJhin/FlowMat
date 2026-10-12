import { describe, expect, it } from 'vitest'
import { DEFAULT_POLICY_FORM, durationText, policyForm, policyPayload, policySummary } from './executionPolicyModel'

const none = { timeoutSeconds: null, retryLimit: null, retryDelaySeconds: null, retryBackoff: null, maxRetryDelaySeconds: null,
  concurrencyLimit: null }

describe('execution policy', () => {
  it('says the policy in a line, defaults filled in', () => {
    expect(policySummary(none)).toBe('No time limit · 3 retries at once · no concurrency limit')
    expect(policySummary({ timeoutSeconds: 600, retryLimit: 3, retryDelaySeconds: 30, retryBackoff: 'exponential',
      maxRetryDelaySeconds: 300, concurrencyLimit: 2 }))
      .toBe('Times out after 10 min · 3 retries, 30 s apart, doubling up to 5 min · at most 2 at once')
    expect(policySummary({ ...none, retryLimit: 0 })).toBe('No time limit · no retries · no concurrency limit')
    expect(policySummary({ ...none, retryLimit: 1, retryDelaySeconds: 5400, retryBackoff: 'fixed' }))
      .toBe('No time limit · 1 retry, 1 h 30 min apart · no concurrency limit')
    expect(durationText(45)).toBe('45 s')
    expect(durationText(2 * 86_400)).toBe('2 d')
  })

  it('checks the form as the server does', () => {
    expect(policyPayload(DEFAULT_POLICY_FORM, 4).input).toEqual({ timeoutSeconds: null, retryLimit: null, retryDelaySeconds: null,
      retryBackoff: null, maxRetryDelaySeconds: null, concurrencyLimit: null, expectedVersion: 4 })
    expect(policyPayload({ ...DEFAULT_POLICY_FORM, timeoutSeconds: '0' }, 0).error)
      .toBe('The time limit is a whole number between 1 second and 7 days (604800 s).')
    expect(policyPayload({ ...DEFAULT_POLICY_FORM, retryLimit: '2.5' }, 0).error).toBe('Retries is a whole number between 0 and 10.')
    expect(policyPayload({ ...DEFAULT_POLICY_FORM, maxRetryDelaySeconds: '60' }, 0).error).toBe('A delay cap needs doubling delays.')
    expect(policyPayload({ ...DEFAULT_POLICY_FORM, retryBackoff: 'exponential', retryDelaySeconds: '120', maxRetryDelaySeconds: '60' }, 0)
      .error).toBe('The delay cap cannot be below the retry delay.')
    const form = policyForm({ timeoutSeconds: 600, retryLimit: 3, retryDelaySeconds: 30, retryBackoff: 'exponential',
      maxRetryDelaySeconds: 300, concurrencyLimit: 2 })
    expect(policyPayload(form, 1).input).toEqual({ timeoutSeconds: 600, retryLimit: 3, retryDelaySeconds: 30, retryBackoff: 'exponential',
      maxRetryDelaySeconds: 300, concurrencyLimit: 2, expectedVersion: 1 })
  })
})
