import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, UnitDto } from '../../../shared/types/api'

async function fetchUnits(includeInactive: boolean): Promise<UnitDto[]> {
  const envelope = await httpClient.get<ApiEnvelope<UnitDto[]>>(`/units?includeInactive=${includeInactive}`)
  return unwrapApiResponse(envelope)
}

/** Global unit master; active units only unless includeInactive is set. */
export function useUnitsQuery(includeInactive = false) {
  return useQuery<UnitDto[]>({
    queryKey: ['units', includeInactive],
    queryFn: () => fetchUnits(includeInactive),
    staleTime: 10 * 60 * 1000,
  })
}
