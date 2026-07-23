import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, UserRoleDto } from '../../../shared/types/api'

async function grantRole(userId: string, roleName: string): Promise<UserRoleDto> {
  const envelope = await httpClient.post<ApiEnvelope<UserRoleDto>>(
    `/admin/users/${encodeURIComponent(userId)}/roles`,
    { roleName }
  )
  return unwrapApiResponse(envelope)
}

export function useGrantRoleMutation(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roleName: string) => grantRole(userId, roleName),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-user-roles', userId] })
    },
  })
}
