import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import { createStockCommand } from './stockCommand'
import type { ApiEnvelope, ExpiredWriteOffDto } from '../../../shared/types/api'

export interface ExpiredWriteOffInput {
  lotIds?: string[]
  note?: string
  closeLots: boolean
}

/** Writes off the stock of expired LOTs (all of them when no LOT is named); closing them afterwards needs owner access. */
export function useExpiredWriteOffMutation(projectId: string) {
  const queryClient = useQueryClient()
  const [command] = useState(() => createStockCommand<ExpiredWriteOffInput & { projectId: string }, ExpiredWriteOffDto>(
    async (input) => unwrapApiResponse(
      await httpClient.post<ApiEnvelope<ExpiredWriteOffDto>>('/lots/expired/write-off', input),
    ),
  ))
  return useMutation({
    mutationFn: (input: ExpiredWriteOffInput) => command({ ...input, projectId,
      lotIds: input.lotIds ? [...input.lotIds].sort() : undefined,
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventories', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['lots', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] })
    },
  })
}
