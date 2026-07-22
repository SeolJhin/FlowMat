import { useMutation } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProjectMemberDto } from '../../../shared/types/api'

async function acceptInvite(inviteToken: string): Promise<ProjectMemberDto> {
  const envelope = await httpClient.post<ApiEnvelope<ProjectMemberDto>>(
    '/project-invites/accept',
    { inviteToken }
  )
  return unwrapApiResponse(envelope)
}

export function useAcceptInviteMutation() {
  return useMutation({ mutationFn: acceptInvite })
}
