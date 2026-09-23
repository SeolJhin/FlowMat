import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, InventoryDto } from '../../../shared/types/api'

/** Mirrors the backend InventoryAdjustRequest (used for both create and adjust). */
export interface InventoryInput {
  projectId: string
  itemId: string
  quantity: number
  reservedQuantity?: number
  location?: string
  inventoryStatus?: string
  minThreshold?: number
  maxThreshold?: number
  /** For adjustments: the version the user saw. A mismatch returns 409 instead of overwriting newer movements. */
  expectedVersion?: number
}

async function createInventory(input: InventoryInput): Promise<InventoryDto> {
  const envelope = await httpClient.post<ApiEnvelope<InventoryDto>>('/inventories', input)
  return unwrapApiResponse(envelope)
}

export function useCreateInventoryMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createInventory,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventories', projectId] })
    },
  })
}
