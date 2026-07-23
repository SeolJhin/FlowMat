import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import type { ApiEnvelope } from '../../../shared/types/api'
import { unwrapApiVoidResponse } from '../../../shared/api/unwrapApiResponse'
import { removeWorkflowCanvasConnection } from '../model/workflowCanvasCache'
import type { WorkflowCanvasViewModel } from '../model/types'

async function deleteProcessConnection(connectionId: string): Promise<void> {
  const envelope = await httpClient.delete<ApiEnvelope<null>>(
    `/process-connections/${connectionId}`
  )
  return unwrapApiVoidResponse(envelope)
}

export function useDeleteProcessConnectionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProcessConnection,
    onMutate: (connectionId) => {
      const canvases = queryClient.getQueriesData<WorkflowCanvasViewModel>({ queryKey: ['workflow-canvas'] })
      for (const [, canvas] of canvases) {
        if (canvas?.edges.some((edge) => edge.id === connectionId)) {
          return { workflowId: canvas.workflow.workflowId, connectionId }
        }
      }
      return { workflowId: null as string | null, connectionId }
    },
    onSuccess: (_data, _connectionId, context) => {
      if (!context?.workflowId) return
      removeWorkflowCanvasConnection(queryClient, context.workflowId, context.connectionId)
    },
  })
}
