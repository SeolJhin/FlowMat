import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, RoleDto } from '../../../shared/types/api'

async function fetchRoles(): Promise<RoleDto[]> {
  const envelope = await httpClient.get<ApiEnvelope<RoleDto[]>>('/admin/users/roles')
  return unwrapApiResponse(envelope)
}

export function useRolesQuery() {
  return useQuery<RoleDto[]>({
    queryKey: ['admin-roles'],
    queryFn: fetchRoles,
    retry: false,
  })
}
