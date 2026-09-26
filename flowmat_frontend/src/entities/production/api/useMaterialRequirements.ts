import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, MaterialRequirementDto } from '../../../shared/types/api'

/**
 * Material needs of open work orders against usable stock (docs/domain/material-requirements.md). Under
 * ['inventories', projectId] so stock movements refresh it, and fetched fresh when shown, which covers work order changes.
 */
export function useMaterialRequirementsQuery(projectId: string) {
  return useQuery<MaterialRequirementDto>({
    queryKey: ['inventories', projectId, 'open-order-needs'],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<MaterialRequirementDto>>(`/material-requirements?projectId=${encodeURIComponent(projectId)}`),
      ),
    enabled: Boolean(projectId),
    staleTime: 0,
  })
}
