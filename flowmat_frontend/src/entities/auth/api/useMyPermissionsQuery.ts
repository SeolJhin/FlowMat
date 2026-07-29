import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, UserPermissionDto } from '../../../shared/types/api'

async function fetchMyPermissions(): Promise<UserPermissionDto> {
  const envelope = await httpClient.get<ApiEnvelope<UserPermissionDto>>('/users/me/permissions')
  return unwrapApiResponse(envelope)
}

export function useMyPermissionsQuery(enabled = true) {
  return useQuery<UserPermissionDto>({
    queryKey: ['current-user-permissions'],
    queryFn: fetchMyPermissions,
    staleTime: 5 * 60 * 1000,
    enabled,
  })
}
