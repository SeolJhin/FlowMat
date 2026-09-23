import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import { errorStatus } from '../../../shared/lib/errorMessage'
import type { ApiEnvelope, InventoryDto } from '../../../shared/types/api'
import type { InventoryInput } from './useCreateInventoryMutation'

export interface UpdateInventoryInput extends InventoryInput {
  inventoryId: string
}

async function updateInventory({ inventoryId, ...payload }: UpdateInventoryInput): Promise<InventoryDto> {
  const envelope = await httpClient.put<ApiEnvelope<InventoryDto>>(
    `/inventories/${encodeURIComponent(inventoryId)}`,
    payload,
  )
  return unwrapApiResponse(envelope)
}

export function useUpdateInventoryMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateInventory,
    onSuccess: (inventory) => {
      void queryClient.invalidateQueries({ queryKey: ['inventories', projectId] })
      // The backend records an "adjust" transaction for every update.
      void queryClient.invalidateQueries({ queryKey: ['inventory-transactions', inventory.inventoryId] })
    },
    onError: (error) => {
      // 409: someone moved this stock after the form was opened; fetch the current figures.
      if (errorStatus(error) === 409) {
        void queryClient.invalidateQueries({ queryKey: ['inventories', projectId] })
      }
    },
  })
}
