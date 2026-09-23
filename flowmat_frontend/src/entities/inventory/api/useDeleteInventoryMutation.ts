import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiVoidResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

async function deleteInventory(inventoryId: string): Promise<void> {
  const envelope = await httpClient.delete<ApiEnvelope<null>>(`/inventories/${encodeURIComponent(inventoryId)}`)
  unwrapApiVoidResponse(envelope)
}

export function useDeleteInventoryMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteInventory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventories', projectId] })
    },
  })
}
