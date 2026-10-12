import type { ExecutionPolicyDto, ExecutionPolicyInput } from '../api/useExecutionPolicy'

/** The policy form, as typed; an empty field uses the default (docs/domain/flow-run-execution-policy.md EP1). */
export interface PolicyForm {
  timeoutSeconds: string
  retryLimit: string
  retryDelaySeconds: string
  retryBackoff: '' | 'fixed' | 'exponential'
  maxRetryDelaySeconds: string
  concurrencyLimit: string
}

type Policy = Pick<ExecutionPolicyDto, 'timeoutSeconds' | 'retryLimit' | 'retryDelaySeconds' | 'retryBackoff' | 'maxRetryDelaySeconds'
  | 'concurrencyLimit'>

export function policyForm(policy: Policy): PolicyForm {
  const text = (value: number | null) => (value === null ? '' : String(value))
  return {
    timeoutSeconds: text(policy.timeoutSeconds),
    retryLimit: text(policy.retryLimit),
    retryDelaySeconds: text(policy.retryDelaySeconds),
    retryBackoff: policy.retryBackoff ?? '',
    maxRetryDelaySeconds: text(policy.maxRetryDelaySeconds),
    concurrencyLimit: text(policy.concurrencyLimit),
  }
}

/** Every field empty: the node goes back to the default behavior. */
export const DEFAULT_POLICY_FORM: PolicyForm = {
  timeoutSeconds: '', retryLimit: '', retryDelaySeconds: '', retryBackoff: '', maxRetryDelaySeconds: '', concurrencyLimit: '',
}

/**
 * The request before it is sent, checked as the server checks it (EP1-EP2): whole numbers in range, a delay cap only for
 * doubling delays and not below the delay.
 */
export function policyPayload(
  form: PolicyForm,
  expectedVersion: number,
): { input: ExecutionPolicyInput; error: null } | { input: null; error: string } {
  const values: Record<string, number | null> = {}
  const fields: [keyof PolicyForm, string, number, number, string][] = [
    ['timeoutSeconds', 'The time limit', 1, 604_800, 'between 1 second and 7 days (604800 s)'],
    ['retryLimit', 'Retries', 0, 10, 'between 0 and 10'],
    ['retryDelaySeconds', 'The retry delay', 0, 86_400, 'between 0 and 1 day (86400 s)'],
    ['maxRetryDelaySeconds', 'The delay cap', 0, 604_800, 'at most 7 days (604800 s)'],
    ['concurrencyLimit', 'At most at once', 1, 1000, 'between 1 and 1000'],
  ]
  for (const [field, name, min, max, range] of fields) {
    const text = String(form[field]).trim()
    if (!text) {
      values[field] = null
      continue
    }
    if (!/^\d+$/.test(text) || Number(text) < min || Number(text) > max) {
      return { input: null, error: `${name} is a whole number ${range}.` }
    }
    values[field] = Number(text)
  }
  if (values.maxRetryDelaySeconds !== null) {
    if (form.retryBackoff !== 'exponential') return { input: null, error: 'A delay cap needs doubling delays.' }
    if (values.maxRetryDelaySeconds < (values.retryDelaySeconds ?? 0)) {
      return { input: null, error: 'The delay cap cannot be below the retry delay.' }
    }
  }
  return {
    input: {
      timeoutSeconds: values.timeoutSeconds, retryLimit: values.retryLimit, retryDelaySeconds: values.retryDelaySeconds,
      retryBackoff: form.retryBackoff || null, maxRetryDelaySeconds: values.maxRetryDelaySeconds,
      concurrencyLimit: values.concurrencyLimit, expectedVersion,
    },
    error: null,
  }
}

/** "45 s", "10 min", "1 h 30 min", "2 d". */
export function durationText(seconds: number): string {
  if (seconds < 60) return `${seconds} s`
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  const parts = [days ? `${days} d` : '', hours ? `${hours} h` : '', minutes ? `${minutes} min` : '', rest ? `${rest} s` : '']
  return parts.filter(Boolean).join(' ')
}

/**
 * The policy in a line, defaults filled in: "Times out after 10 min · 3 retries, 30 s apart, doubling up to 5 min · at
 * most 2 at once"; the default is "No time limit · 3 retries at once · no concurrency limit".
 */
export function policySummary(policy: Policy): string {
  const limit = policy.retryLimit ?? 3
  const delay = policy.retryDelaySeconds ?? 0
  let retries = limit === 0 ? 'no retries' : `${limit} retr${limit === 1 ? 'y' : 'ies'}`
  if (limit > 0) {
    retries += delay === 0 ? ' at once' : `, ${durationText(delay)} apart`
    if (delay > 0 && policy.retryBackoff === 'exponential') {
      retries += `, doubling${policy.maxRetryDelaySeconds !== null ? ` up to ${durationText(policy.maxRetryDelaySeconds)}` : ''}`
    }
  }
  const parts = [
    policy.timeoutSeconds === null ? 'no time limit' : `times out after ${durationText(policy.timeoutSeconds)}`,
    retries,
    policy.concurrencyLimit === null ? 'no concurrency limit' : `at most ${policy.concurrencyLimit} at once`,
  ]
  const line = parts.join(' · ')
  return line.charAt(0).toUpperCase() + line.slice(1)
}
