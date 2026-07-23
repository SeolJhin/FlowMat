import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiVoidResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

async function revokeRole(userId: string, userRolesId: string): Promise<void> {
  const envelope = await httpClient.delete<ApiEnvelope<null>>(
    `/admin/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(userRolesId)}`
  )
  unwrapApiVoidResponse(envelope)
}

export function useRevokeRoleMutation(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userRolesId: string) => revokeRole(userId, userRolesId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-user-roles', userId] })
    },
  })
}
