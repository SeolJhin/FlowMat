import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse, unwrapApiVoidResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProcessTemplateDto } from '../../../shared/types/api'

/** Mirrors ProcessTemplateCreateRequest / ProcessTemplateUpdateRequest on the backend (requires template:manage). */
export interface ProcessTemplateInput {
  templateName: string
  templateCategory: string
  templateType?: string
  iconKey?: string
  defaultColorScheme?: string
  defaultWidth?: number
  defaultHeight?: number
  defaultDesc?: string
  publicYn?: 'Y' | 'N'
  sortOrder?: number
}

async function saveProcessTemplate({
  templateId,
  ...payload
}: ProcessTemplateInput & { templateId?: string }): Promise<ProcessTemplateDto> {
  const envelope = templateId
    ? await httpClient.put<ApiEnvelope<ProcessTemplateDto>>(`/process-templates/${encodeURIComponent(templateId)}`, payload)
    : await httpClient.post<ApiEnvelope<ProcessTemplateDto>>('/process-templates', payload)
  return unwrapApiResponse(envelope)
}

async function deleteProcessTemplate(templateId: string): Promise<void> {
  const envelope = await httpClient.delete<ApiEnvelope<null>>(`/process-templates/${encodeURIComponent(templateId)}`)
  unwrapApiVoidResponse(envelope)
}

/** Create when templateId is omitted, update otherwise. */
export function useSaveProcessTemplateMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveProcessTemplate,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['process-templates'] })
    },
  })
}

export function useDeleteProcessTemplateMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteProcessTemplate,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['process-templates'] })
    },
  })
}
