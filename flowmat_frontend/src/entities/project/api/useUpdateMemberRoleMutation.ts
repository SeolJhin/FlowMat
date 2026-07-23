import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProjectMemberDto } from '../../../shared/types/api'

export interface UpdateMemberRoleInput {
  projectMemberId: string
  projectRole: string
}

async function updateRole(input: UpdateMemberRoleInput): Promise<ProjectMemberDto> {
  const envelope = await httpClient.put<ApiEnvelope<ProjectMemberDto>>(
    `/project-members/${encodeURIComponent(input.projectMemberId)}/role`,
    { projectRole: input.projectRole }
  )
  return unwrapApiResponse(envelope)
}

export function useUpdateMemberRoleMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateRole,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
    },
  })
}
