import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import type { ApiEnvelope } from '../../../shared/types/api'
import { unwrapApiVoidResponse } from '../../../shared/api/unwrapApiResponse'
import { removeWorkflowCanvasProcess } from '../model/workflowCanvasCache'
import type { WorkflowCanvasViewModel } from '../model/types'

async function deleteProcess(processId: string): Promise<void> {
  const envelope = await httpClient.delete<ApiEnvelope<null>>(`/processes/${processId}`)
  return unwrapApiVoidResponse(envelope)
}

export function useDeleteProcessMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProcess,
    onMutate: (processId) => {
      const canvases = queryClient.getQueriesData<WorkflowCanvasViewModel>({ queryKey: ['workflow-canvas'] })
      for (const [, canvas] of canvases) {
        if (canvas?.nodeMap[processId]) {
          return { workflowId: canvas.workflow.workflowId, processId }
        }
      }
      return { workflowId: null as string | null, processId }
    },
    onSuccess: (_data, _processId, context) => {
      if (!context?.workflowId) return
      removeWorkflowCanvasProcess(queryClient, context.workflowId, context.processId)
    },
  })
}
