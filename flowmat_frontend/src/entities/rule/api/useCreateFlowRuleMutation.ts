import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, FlowRuleDto } from '../../../shared/types/api'

export interface CreateFlowRuleInput {
  projectId: string
  targetType: string
  targetId: string
  ruleName: string
  ruleDesc?: string
  conditionType?: string
  conditionExpression: string
  actionType?: string
  actionConfig?: string
  priority?: number
  enabledYn?: string
}

async function createFlowRule(input: CreateFlowRuleInput): Promise<FlowRuleDto> {
  const envelope = await httpClient.post<ApiEnvelope<FlowRuleDto>>('/flow-rules', input)
  return unwrapApiResponse(envelope)
}

export function useCreateFlowRuleMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createFlowRule,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['flow-rules', projectId] })
    },
  })
}
