import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProjectInvitePreviewDto } from '../../../shared/types/api'

async function fetchInvitePreview(token: string): Promise<ProjectInvitePreviewDto> {
  const envelope = await httpClient.get<ApiEnvelope<ProjectInvitePreviewDto>>(
    `/project-invites/preview?token=${encodeURIComponent(token)}`,
  )
  return unwrapApiResponse(envelope)
}

export function useInvitePreviewQuery(token: string | null, enabled: boolean) {
  return useQuery<ProjectInvitePreviewDto>({
    queryKey: ['project-invite-preview', token],
    queryFn: () => fetchInvitePreview(token ?? ''),
    enabled: enabled && Boolean(token),
    retry: false,
  })
}
