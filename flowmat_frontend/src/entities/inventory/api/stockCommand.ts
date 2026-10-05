import { newRequestId } from '../../../shared/lib/requestId'

/**
 * Keeps an unacknowledged command's key while this sender is mounted. Nested JSON payloads keep every field and array position.
 * A failed response does not prove that the transaction failed; identical wire contents must reuse their key. Once
 * acknowledged, submitting the same contents again is a new operation. No stock data or keys are persisted to storage.
 */
export function createStockCommand<Input extends object, Result>(
  send: (input: Input & { requestId: string }) => Promise<Result>,
): (input: Input) => Promise<Result> {
  const unacknowledged = new Map<string, string>()
  return async (input) => {
    const signature = JSON.stringify(input, (_key, value: unknown) => {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) return value
      const record = value as Record<string, unknown>
      return Object.fromEntries(Object.keys(record).sort().map((key) => [key, record[key]]))
    })
    const requestId = unacknowledged.get(signature) ?? newRequestId()
    unacknowledged.set(signature, requestId)
    const result = await send({ ...input, requestId })
    unacknowledged.delete(signature)
    return result
  }
}