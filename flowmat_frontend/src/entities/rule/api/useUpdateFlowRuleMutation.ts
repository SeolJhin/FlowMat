import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, FlowRuleDto } from '../../../shared/types/api'

export interface UpdateFlowRuleInput {
  ruleId: string
  targetType?: string
  targetId?: string
  ruleName?: string
  ruleDesc?: string
  conditionType?: string
  conditionExpression?: string
  actionType?: string
  actionConfig?: string
  priority?: number
  enabledYn?: string
}

async function updateFlowRule({ ruleId, ...payload }: UpdateFlowRuleInput): Promise<FlowRuleDto> {
  const envelope = await httpClient.put<ApiEnvelope<FlowRuleDto>>(`/flow-rules/${ruleId}`, payload)
  return unwrapApiResponse(envelope)
}

export function useUpdateFlowRuleMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateFlowRule,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['flow-rules', projectId] })
    },
  })
}
