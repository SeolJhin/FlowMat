import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProcessDto } from '../../../shared/types/api'
import { patchWorkflowCanvasProcess } from '../model/workflowCanvasCache'

export interface ApplyTemplateInput {
  templateId: string
  workflowId: string
  processName?: string
  posX?: number
  posY?: number
}

async function applyTemplate({ templateId, ...payload }: ApplyTemplateInput): Promise<ProcessDto> {
  const envelope = await httpClient.post<ApiEnvelope<ProcessDto>>(
    `/process-templates/${templateId}/apply`,
    payload,
  )
  return unwrapApiResponse(envelope)
}

export function useApplyProcessTemplateMutation(_workflowId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: applyTemplate,
    onSuccess: (process) => {
      patchWorkflowCanvasProcess(queryClient, process)
    },
  })
}
