import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

async function deleteItem(itemId: string): Promise<void> {
  const envelope = await httpClient.delete<ApiEnvelope<null>>(`/items/${itemId}`)
  unwrapApiResponse(envelope)
}

export function useDeleteItemMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteItem,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['items', projectId] })
    },
  })
}
