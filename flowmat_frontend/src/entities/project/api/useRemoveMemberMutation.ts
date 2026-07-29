import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiVoidResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

async function removeMember(projectMemberId: string): Promise<void> {
  const envelope = await httpClient.delete<ApiEnvelope<null>>(
    `/project-members/${encodeURIComponent(projectMemberId)}`
  )
  unwrapApiVoidResponse(envelope)
}

export function useRemoveMemberMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: removeMember,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
    },
  })
}
