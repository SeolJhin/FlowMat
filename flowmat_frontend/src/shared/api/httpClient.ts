import { normalizeUiError } from '../lib/normalizeUiError'
import type { ApiEnvelope } from '../types/api'

const BASE = '/api'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  return typeof value === 'object' && value !== null && 'success' in value && 'message' in value
}

async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  const json = text ? (JSON.parse(text) as unknown) : null

  if (!res.ok) {
    const message =
      isApiEnvelope(json) && typeof json.message === 'string' && json.message.trim().length > 0
        ? json.message
        : `Request failed with status ${res.status}`
    throw normalizeUiError(res.status, message)
  }

  return json as T
}

export const httpClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
