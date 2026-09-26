import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import { newRequestId } from '../../../shared/lib/requestId'
import type { ApiEnvelope, FefoIssueDto } from '../../../shared/types/api'

export interface FefoIssueInput {
  itemId: string
  quantity: number
  unit?: string
  note?: string
  /** issue (the default) takes the stock away; reserve holds it on the records. */
  action?: 'issue' | 'reserve'
}

/** Issues or reserves an item's stock from its LOTs, first-expiring first; one movement per stock record, all or nothing. */
export function useFefoIssueMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: FefoIssueInput) =>
      unwrapApiResponse(
        await httpClient.post<ApiEnvelope<FefoIssueDto>>('/inventories/issue-fefo', { projectId, ...input, requestId: newRequestId() }),
      ),
    onSuccess: () => {
      // Records, LOT totals, the ledger and the alerts all read the stock that moved.
      void queryClient.invalidateQueries({ queryKey: ['inventories', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['lots', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] })
    },
  })
}
