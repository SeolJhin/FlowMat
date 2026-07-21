import { Link, useParams } from 'react-router-dom'
import { useWorkflowCanvasQuery } from '../../../entities/workflow/api/useWorkflowCanvasQuery'
import { WorkflowCanvasPage } from './WorkflowCanvasPage'

export function WorkspaceRoute() {
  const { projectId = '', workflowId = '' } = useParams<{ projectId: string; workflowId: string }>()
  const { data: canvas, isLoading, isError, error } = useWorkflowCanvasQuery(workflowId)

  if (isLoading) {
    return <div className="workspace-loading">Loading canvas...</div>
  }

  if (isError || !canvas) {
    const msg = error instanceof Error ? error.message : 'Failed to load canvas.'
    return (
      <div className="workspace-error" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span>{msg}</span>
        <Link to="/" style={{ fontSize: 13, color: 'var(--accent)' }}>← 홈으로 돌아가기</Link>
      </div>
    )
  }

  return <WorkflowCanvasPage canvas={canvas} projectId={projectId} />
}
