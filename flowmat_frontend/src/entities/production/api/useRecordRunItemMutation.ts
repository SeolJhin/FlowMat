import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProductionRunItemDto } from '../../../shared/types/api'

export interface RecordRunItemInput {
  productionRunId: string
  itemId: string
  direction: 'input' | 'output'
  plannedQty: number
  actualQty?: number
  unit: string
  inventoryId?: string
  processId?: string
  processIoId?: string
}

async function recordRunItem({ productionRunId, ...payload }: RecordRunItemInput): Promise<ProductionRunItemDto> {
  const envelope = await httpClient.post<ApiEnvelope<ProductionRunItemDto>>(
    `/production-runs/${encodeURIComponent(productionRunId)}/items`,
    payload,
  )
  return unwrapApiResponse(envelope)
}

export function useRecordRunItemMutation(productionRunId: string, projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: recordRunItem,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['production-run-items', productionRunId] })
      // Linked inventory rows are adjusted server-side when an item is recorded.
      void queryClient.invalidateQueries({ queryKey: ['inventories', projectId] })
    },
  })
}
