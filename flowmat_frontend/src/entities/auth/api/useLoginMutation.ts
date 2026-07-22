import { useMutation } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse, unwrapApiVoidResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

export interface LoginRequest {
  userIdOrEmail: string
  password: string
}

export interface SignupRequest {
  userId: string
  userName: string
  userEmail: string
  password: string
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
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
  getAccess:  () => localStorage.getItem('access_token'),
  getRefresh: () => localStorage.getItem('refresh_token'),
  set: (access: string, refresh: string) => {
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
  },
  clear: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  },
}

async function login(req: LoginRequest): Promise<TokenResponse> {
  const envelope = await httpClient.post<ApiEnvelope<TokenResponse>>('/auth/login', req)
  return unwrapApiResponse(envelope)
}

async function signup(req: SignupRequest): Promise<void> {
  const envelope = await httpClient.post<ApiEnvelope<null>>('/auth/signup', req)
  unwrapApiVoidResponse(envelope)
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => tokenStorage.set(data.accessToken, data.refreshToken),
  })
}

export function useSignupMutation() {
  return useMutation({ mutationFn: signup })
}

// Cannot use httpClient for refresh/logout — these endpoints authenticate
// with the refresh token, not the access token that httpClient attaches.
// Calling httpClient here would also risk an infinite 401-retry loop.

export async function refreshAccessToken(): Promise<boolean> {
  const rt = tokenStorage.getRefresh()
  if (!rt) return false
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { Authorization: `Bearer ${rt}`, 'Content-Type': 'application/json' },
    })
    if (!res.ok) return false
    const json = await res.json() as ApiEnvelope<TokenResponse>
    if (!json.success || !json.data) return false
    tokenStorage.set(json.data.accessToken, json.data.refreshToken)
    return true
  } catch {
    return false
  }
}

export function useLogoutMutation() {
  return useMutation({
    mutationFn: async () => {
      const rt = tokenStorage.getRefresh()
      if (!rt) return
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${rt}`, 'Content-Type': 'application/json' },
        })
      } catch { /* ignore — local session is cleared in onSettled regardless */ }
    },
    onSettled: () => tokenStorage.clear(),
  })
}
