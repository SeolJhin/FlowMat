import { useMutation } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
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
  unwrapApiResponse(envelope)
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

export async function refreshAccessToken(): Promise<boolean> {
  const rt = tokenStorage.getRefresh()
  if (!rt) return false
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${rt}`, 'Content-Type': 'application/json' },
    })
    if (!res.ok) return false
    const body = await res.json() as { data: TokenResponse }
    tokenStorage.set(body.data.accessToken, body.data.refreshToken)
    return true
  } catch {
    return false
  }
}

export function useLogoutMutation() {
  return useMutation({
    mutationFn: async () => {
      const rt = tokenStorage.getRefresh()
      if (rt) {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${rt}`, 'Content-Type': 'application/json' },
          })
        } catch { /* ignore */ }
      }
    },
    onSettled: () => tokenStorage.clear(),
  })
}
