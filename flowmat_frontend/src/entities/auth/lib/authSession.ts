import type { ApiEnvelope } from '../../../shared/types/api'

const ACCESS_TOKEN_KEY = 'access_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const COOKIE_SESSION_KEY = 'flowmat_refresh_cookie'
const AUTH_CHANGE_EVENT = 'flowmat-auth-changed'

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
  getAccess: () => (isBrowser() ? window.localStorage.getItem(ACCESS_TOKEN_KEY) : null),
  getRefresh: () => (isBrowser() ? window.localStorage.getItem(REFRESH_TOKEN_KEY) : null),
  hasCookieBackedSession: () => isBrowser() && window.localStorage.getItem(COOKIE_SESSION_KEY) === '1',
  hasRefreshSessionHint: () => {
    if (!isBrowser()) return false
    return !!window.localStorage.getItem(REFRESH_TOKEN_KEY) || window.localStorage.getItem(COOKIE_SESSION_KEY) === '1'
  },
  set: (access: string, refresh?: string | null, options?: { cookieBacked?: boolean }) => {
    if (!isBrowser()) return
    window.localStorage.setItem(ACCESS_TOKEN_KEY, access)
    if (refresh && refresh.trim().length > 0) {
      window.localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
    } else {
      window.localStorage.removeItem(REFRESH_TOKEN_KEY)
    }
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
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    window.localStorage.removeItem(REFRESH_TOKEN_KEY)
    window.localStorage.removeItem(COOKIE_SESSION_KEY)
    notifyAuthChanged()
  },
}

let refreshPromise: Promise<boolean> | null = null

async function performRefresh(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefresh()
  const cookieBacked = tokenStorage.hasCookieBackedSession()
  if (!refreshToken && !cookieBacked) {
    tokenStorage.clear()
    return false
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (refreshToken) {
      headers.Authorization = `Bearer ${refreshToken}`
    }

    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'same-origin',
      headers,
    })
    if (!res.ok) {
      tokenStorage.clear()
      return false
    }

    const json = (await res.json()) as ApiEnvelope<{ accessToken: string; refreshToken: string }>
    if (!json.success || !json.data?.accessToken) {
      tokenStorage.clear()
      return false
    }

    if (json.data.refreshToken) {
      tokenStorage.set(json.data.accessToken, json.data.refreshToken, { cookieBacked })
    } else {
      tokenStorage.setAccessToken(json.data.accessToken, { cookieBacked: cookieBacked || !refreshToken })
    }
    return true
  } catch {
    tokenStorage.clear()
    return false
  }
}

export async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = performRefresh().finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}
