import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, FlowRuleDto } from '../../../shared/types/api'

async function fetchFlowRules(projectId: string): Promise<FlowRuleDto[]> {
  const envelope = await httpClient.get<ApiEnvelope<FlowRuleDto[]>>(
    `/flow-rules?projectId=${encodeURIComponent(projectId)}`,
  )
  return unwrapApiResponse(envelope)
}

export function useFlowRulesQuery(projectId: string) {
  return useQuery<FlowRuleDto[]>({
    queryKey: ['flow-rules', projectId],
    queryFn: () => fetchFlowRules(projectId),
    enabled: Boolean(projectId),
  })
}
