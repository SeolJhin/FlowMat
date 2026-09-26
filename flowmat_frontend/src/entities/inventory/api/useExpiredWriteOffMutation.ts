import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import { newRequestId } from '../../../shared/lib/requestId'
import type { ApiEnvelope, ExpiredWriteOffDto } from '../../../shared/types/api'

/** Writes off the stock of expired LOTs (all of them when no LOT is named); closing them afterwards needs owner access. */
export function useExpiredWriteOffMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { lotIds?: string[]; note?: string; closeLots: boolean }) =>
      unwrapApiResponse(
        await httpClient.post<ApiEnvelope<ExpiredWriteOffDto>>('/lots/expired/write-off', { projectId, ...input, requestId: newRequestId() }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventories', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['lots', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] })
    },
  })
}
