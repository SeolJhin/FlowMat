import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse, unwrapApiVoidResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

export type StorageLocationType = 'site' | 'warehouse' | 'zone' | 'location' | 'bin'

/** A place the project keeps stock (docs/domain/storage-location.md). */
export interface StorageLocationDto {
  locationId: string
  projectId: string
  parentLocationId: string | null
  locationCode: string
  locationName: string | null
  locationType: StorageLocationType
  active: boolean
  note: string | null
  /** The codes from the top-level place down to this one, joined with " / ". */
  path: string
  depth: number
  /** Stock records here that hold stock (on hand or reserved), and their different items. */
  stockRecords: number
  itemCount: number
}

export interface StorageLocationCreateInput {
  projectId: string
  locationCode: string
  locationName: string | null
  locationType: StorageLocationType
  parentLocationId: string | null
  note: string | null
}

/** Only the fields given change; an empty name or note clears it. */
export interface StorageLocationUpdateInput {
  locationCode?: string
  locationName?: string
  locationType?: StorageLocationType
  parentLocationId?: string
  clearParent?: boolean
  active?: boolean
  note?: string
}

export const storageLocationsKey = (projectId: string) => ['storage-locations', projectId] as const

export function useStorageLocationsQuery(projectId: string) {
  return useQuery<StorageLocationDto[]>({
    queryKey: storageLocationsKey(projectId),
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<StorageLocationDto[]>>(`/storage-locations?projectId=${encodeURIComponent(projectId)}`),
      ),
    enabled: Boolean(projectId),
  })
}

/** Adding, changing, switching off, deleting and adopting places; each refreshes the list. */
export function useStorageLocationMutations(projectId: string) {
  const queryClient = useQueryClient()
  const onSuccess = async () => {
    // A first load still in flight may have read the list before this change; TanStack would fold the refetch into it.
    await queryClient.cancelQueries({ queryKey: storageLocationsKey(projectId) })
    void queryClient.invalidateQueries({ queryKey: storageLocationsKey(projectId) })
  }
  const create = useMutation({
    mutationFn: async (input: StorageLocationCreateInput) =>
      unwrapApiResponse(await httpClient.post<ApiEnvelope<StorageLocationDto>>('/storage-locations', input)),
    onSuccess,
  })
  const update = useMutation({
    mutationFn: async ({ locationId, input }: { locationId: string; input: StorageLocationUpdateInput }) =>
      unwrapApiResponse(
        await httpClient.put<ApiEnvelope<StorageLocationDto>>(`/storage-locations/${encodeURIComponent(locationId)}`, input),
      ),
    onSuccess,
  })
  const toggle = useMutation({
    mutationFn: async ({ locationId, active }: { locationId: string; active: boolean }) =>
      unwrapApiResponse(
        await httpClient.put<ApiEnvelope<StorageLocationDto>>(`/storage-locations/${encodeURIComponent(locationId)}`, { active }),
      ),
    onSuccess,
  })
  const remove = useMutation({
    mutationFn: async (locationId: string) =>
      unwrapApiVoidResponse(await httpClient.delete<ApiEnvelope<null>>(`/storage-locations/${encodeURIComponent(locationId)}`)),
    onSuccess,
  })
  const adopt = useMutation({
    mutationFn: async () =>
      unwrapApiResponse(
        await httpClient.post<ApiEnvelope<StorageLocationDto[]>>(
          `/storage-locations/adopt-used?projectId=${encodeURIComponent(projectId)}`,
          {},
        ),
      ),
    onSuccess,
  })
  return { create, update, toggle, remove, adopt }
}
