import { useMutation } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse, unwrapApiVoidResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'
import { parseJwtUserId, refreshAccessToken, tokenStorage } from '../lib/authSession'

export interface LoginRequest {
  userIdOrEmail: string
  password: string
}

export interface SignupRequest {
  userId: string
  userName: string
  userNickname: string
  userEmail: string
  userTel: string
  userBirth: string
  password: string
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
}

async function login(req: LoginRequest): Promise<TokenResponse> {
  const envelope = await httpClient.post<ApiEnvelope<TokenResponse>>('/auth/login', req)
  return unwrapApiResponse(envelope)
}

async function signup(req: SignupRequest): Promise<void> {
  const envelope = await httpClient.post<ApiEnvelope<null>>('/auth/signup', req)
  unwrapApiVoidResponse(envelope)
}

async function sendEmailCode(userEmail: string): Promise<void> {
  const envelope = await httpClient.post<ApiEnvelope<null>>('/auth/email/send-code', { userEmail })
  unwrapApiVoidResponse(envelope)
}

async function verifyEmailCode(input: { userEmail: string; code: string }): Promise<void> {
  const envelope = await httpClient.post<ApiEnvelope<null>>('/auth/email/verify-code', input)
  unwrapApiVoidResponse(envelope)
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => tokenStorage.set(data.accessToken, data.refreshToken, { cookieBacked: false }),
  })
}

export function useSignupMutation() {
  return useMutation({ mutationFn: signup })
}

export function useSendEmailCodeMutation() {
  return useMutation({ mutationFn: sendEmailCode })
}

export function useVerifyEmailCodeMutation() {
  return useMutation({ mutationFn: verifyEmailCode })
}

export function useLogoutMutation() {
  return useMutation({
    mutationFn: async () => {
      const rt = tokenStorage.getRefresh()
      if (!rt) return
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { Authorization: `Bearer ${rt}`, 'Content-Type': 'application/json' },
        })
      } catch {
        // Ignore logout transport failures. Local session is cleared regardless.
      }
    },
    onSettled: () => tokenStorage.clear(),
  })
}

export { parseJwtUserId, refreshAccessToken, tokenStorage }
