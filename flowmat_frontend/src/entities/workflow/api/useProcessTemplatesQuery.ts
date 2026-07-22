import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProcessTemplateDto } from '../../../shared/types/api'

async function fetchProcessTemplates(): Promise<ProcessTemplateDto[]> {
  const envelope = await httpClient.get<ApiEnvelope<ProcessTemplateDto[]>>('/process-templates')
  return unwrapApiResponse(envelope)
}

export function useProcessTemplatesQuery() {
  return useQuery<ProcessTemplateDto[]>({
    queryKey: ['process-templates'],
    queryFn: fetchProcessTemplates,
    staleTime: 10 * 60 * 1000,
  })
}
