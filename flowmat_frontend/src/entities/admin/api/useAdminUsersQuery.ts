import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, UserDto } from '../../../shared/types/api'

async function searchAdminUsers(query: string): Promise<UserDto[]> {
  const envelope = await httpClient.get<ApiEnvelope<UserDto[]>>(
    `/admin/users?q=${encodeURIComponent(query)}`
  )
  return unwrapApiResponse(envelope)
}

export function useAdminUsersQuery(query: string) {
  return useQuery<UserDto[]>({
    queryKey: ['admin-users', query],
    queryFn: () => searchAdminUsers(query),
    retry: false,
  })
}
