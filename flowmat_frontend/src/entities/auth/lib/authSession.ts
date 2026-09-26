import type { ApiEnvelope } from '../../../shared/types/api'

const COOKIE_SESSION_KEY = 'flowmat_refresh_cookie'
const AUTH_CHANGE_EVENT = 'flowmat-auth-changed'
let accessToken: string | null = null

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function notifyAuthChanged() {
  if (!isBrowser()) return
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
}

export function subscribeAuthChange(listener: () => void) {
  if (!isBrowser()) return () => {}

  window.addEventListener(AUTH_CHANGE_EVENT, listener)
  return () => window.removeEventListener(AUTH_CHANGE_EVENT, listener)
}

/** Decode the `sub` claim from a JWT without verifying the signature. */
export function parseJwtUserId(token: string): string | null {
  try {
    const b64 = token.split('.')[1]
    if (!b64) return null
    const payload = JSON.parse(atob(b64.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>
    return typeof payload.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

export const tokenStorage = {
  getAccess: () => accessToken,
  getRefresh: () => null,
  hasCookieBackedSession: () => isBrowser() && window.localStorage.getItem(COOKIE_SESSION_KEY) === '1',
  hasRefreshSessionHint: () => {
    if (!isBrowser()) return false
    return window.localStorage.getItem(COOKIE_SESSION_KEY) === '1'
  },
  set: (access: string, _refresh?: string | null, options?: { cookieBacked?: boolean }) => {
    if (!isBrowser()) return
    accessToken = access
    if (options?.cookieBacked === true) {
      window.localStorage.setItem(COOKIE_SESSION_KEY, '1')
    } else if (options?.cookieBacked === false) {
      window.localStorage.removeItem(COOKIE_SESSION_KEY)
    }
    notifyAuthChanged()
  },
  setAccessToken: (access: string, options?: { cookieBacked?: boolean }) => {
    tokenStorage.set(access, null, options)
  },
  clear: () => {
    if (!isBrowser()) return
    accessToken = null
    window.localStorage.removeItem(COOKIE_SESSION_KEY)
    notifyAuthChanged()
  },
}

let refreshPromise: Promise<boolean> | null = null

async function performRefresh(): Promise<boolean> {
  const cookieBacked = tokenStorage.hasCookieBackedSession()
  if (!cookieBacked) {
    tokenStorage.clear()
    return false
  }

  try {
    const csrfToken = await getCsrfToken()

    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': csrfToken,
      },
    })
    if (!res.ok) {
      tokenStorage.clear()
      return false
    }

    const json = (await res.json()) as ApiEnvelope<{ accessToken: string; refreshToken?: string | null }>
    if (!json.success || !json.data?.accessToken) {
      tokenStorage.clear()
      return false
    }

    tokenStorage.setAccessToken(json.data.accessToken, { cookieBacked: true })
    return true
  } catch {
    tokenStorage.clear()
    return false
  }

}

async function getCsrfToken(): Promise<string> {
  if (!isBrowser()) return ''
  const existing = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
    ?.slice('XSRF-TOKEN='.length)
  if (existing) return decodeURIComponent(existing)

  const res = await fetch('/api/auth/csrf', { credentials: 'same-origin' })
  if (!res.ok) throw new Error('Unable to initialize CSRF protection.')
  const json = (await res.json()) as ApiEnvelope<string>
  if (!json.success || !json.data) throw new Error('Unable to initialize CSRF protection.')
  return json.data
}

export async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise
  }

  const refresh = withRefreshCookieLock(performRefresh)
  refreshPromise = refresh.finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

/** Serialize operations that consume or revoke the shared refresh cookie across tabs. */
export function withRefreshCookieLock<T>(operation: () => Promise<T>): Promise<T> {
  return isBrowser() && navigator.locks
    ? navigator.locks.request('flowmat-refresh', { mode: 'exclusive' }, operation)
    : operation()
}

export { getCsrfToken }
