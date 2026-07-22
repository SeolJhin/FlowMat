import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

async function deleteFlowRule(ruleId: string): Promise<void> {
  const envelope = await httpClient.delete<ApiEnvelope<null>>(`/flow-rules/${ruleId}`)
  unwrapApiResponse(envelope)
}

export function useDeleteFlowRuleMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteFlowRule,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['flow-rules', projectId] })
    },
  })
}
