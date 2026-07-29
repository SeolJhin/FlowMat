import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProjectInviteDto } from '../../../shared/types/api'

export interface CreateInviteInput {
  projectId: string
  invitedEmail: string
  projectRole: string
}

async function createInvite(input: CreateInviteInput): Promise<ProjectInviteDto> {
  const envelope = await httpClient.post<ApiEnvelope<ProjectInviteDto>>('/project-invites', input)
  return unwrapApiResponse(envelope)
}

export function useCreateInviteMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createInvite,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-invites', projectId] })
    },
  })
}
