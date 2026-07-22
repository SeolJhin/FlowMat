import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ItemDto } from '../../../shared/types/api'

export interface CreateItemInput {
  projectId: string
  itemCode: string
  itemName: string
  itemType?: string
  resourceCategory?: string
  itemStatus?: string
}

async function createItem(input: CreateItemInput): Promise<ItemDto> {
  const envelope = await httpClient.post<ApiEnvelope<ItemDto>>('/items', input)
  return unwrapApiResponse(envelope)
}

export function useCreateItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createItem,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['items', data.projectId] })
    },
  })
}
