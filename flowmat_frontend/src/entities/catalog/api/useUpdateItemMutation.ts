import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ItemDto } from '../../../shared/types/api'

export interface UpdateItemInput {
  itemId: string
  projectId: string
  itemName?: string
  itemType?: string
  resourceCategory?: string
  itemStatus?: string
}

async function updateItem({ itemId, projectId: _pid, ...payload }: UpdateItemInput): Promise<ItemDto> {
  const envelope = await httpClient.put<ApiEnvelope<ItemDto>>(`/items/${itemId}`, payload)
  return unwrapApiResponse(envelope)
}

export function useUpdateItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateItem,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['items', data.projectId] })
    },
  })
}
