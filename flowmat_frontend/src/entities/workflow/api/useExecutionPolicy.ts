import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

/**
 * A node's execution policy as saved (docs/domain/flow-run-execution-policy.md EP1-EP2); null uses the default: no time
 * limit, 3 retries at once, no concurrency limit.
 */
export interface ExecutionPolicyDto {
  processId: string
  timeoutSeconds: number | null
  retryLimit: number | null
  retryDelaySeconds: number | null
  retryBackoff: 'fixed' | 'exponential' | null
  maxRetryDelaySeconds: number | null
  concurrencyLimit: number | null
  version: number
}

export type ExecutionPolicyInput = Omit<ExecutionPolicyDto, 'processId' | 'version'> & { expectedVersion: number }

const policyKey = (processId: string) => ['execution-policy', processId] as const
const path = (processId: string) => `/processes/${encodeURIComponent(processId)}/execution-policy`

export function useExecutionPolicyQuery(processId: string) {
  return useQuery<ExecutionPolicyDto>({
    queryKey: policyKey(processId),
    queryFn: async () => unwrapApiResponse(await httpClient.get<ApiEnvelope<ExecutionPolicyDto>>(path(processId))),
    enabled: Boolean(processId),
  })
}

/** Saves with the version it was loaded at; a refusal reads the policy again, so a newer one shows. */
export function useSaveExecutionPolicyMutation(processId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ExecutionPolicyInput) =>
      unwrapApiResponse(await httpClient.put<ApiEnvelope<ExecutionPolicyDto>>(path(processId), input)),
    onSuccess: (saved) => queryClient.setQueryData(policyKey(processId), saved),
    onError: () => void queryClient.invalidateQueries({ queryKey: policyKey(processId) }),
  })
}
