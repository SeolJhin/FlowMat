import { useParams } from 'react-router-dom'
import { useWorkflowCanvasQuery } from '../../../entities/workflow/api/useWorkflowCanvasQuery'
import { WorkflowCanvasPage } from './WorkflowCanvasPage'

export function WorkspaceRoute() {
  const { workflowId = '' } = useParams<{ projectId: string; workflowId: string }>()
  const { data: canvas, isLoading, isError, error } = useWorkflowCanvasQuery(workflowId)

  if (isLoading) return <div className="workspace-loading">Loading canvas…</div>

  if (isError || !canvas) {
    const msg = error instanceof Error ? error.message : 'Failed to load canvas'
    return <div className="workspace-error">{msg}</div>
  }

  return <WorkflowCanvasPage canvas={canvas} />
}
