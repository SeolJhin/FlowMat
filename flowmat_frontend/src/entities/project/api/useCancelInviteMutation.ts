import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiVoidResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

async function cancelInvite(inviteId: string): Promise<void> {
  const envelope = await httpClient.delete<ApiEnvelope<null>>(`/project-invites/${encodeURIComponent(inviteId)}`)
  unwrapApiVoidResponse(envelope)
}

export function useCancelInviteMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cancelInvite,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-invites', projectId] })
    },
  })
}
