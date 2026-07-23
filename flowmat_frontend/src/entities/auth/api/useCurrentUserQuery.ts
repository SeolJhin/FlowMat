import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, UserDto } from '../../../shared/types/api'

async function fetchCurrentUser(): Promise<UserDto> {
  const envelope = await httpClient.get<ApiEnvelope<UserDto>>('/users/me')
  return unwrapApiResponse(envelope)
}

export function useCurrentUserQuery() {
  return useQuery<UserDto>({
    queryKey: ['current-user'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
  })
}
