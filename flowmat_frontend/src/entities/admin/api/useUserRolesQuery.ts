import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, UserRoleDto } from '../../../shared/types/api'

async function fetchUserRoles(userId: string): Promise<UserRoleDto[]> {
  const envelope = await httpClient.get<ApiEnvelope<UserRoleDto[]>>(
    `/admin/users/${encodeURIComponent(userId)}/roles`
  )
  return unwrapApiResponse(envelope)
}

export function useUserRolesQuery(userId: string) {
  return useQuery<UserRoleDto[]>({
    queryKey: ['admin-user-roles', userId],
    queryFn: () => fetchUserRoles(userId),
    enabled: !!userId,
    retry: false,
  })
}
