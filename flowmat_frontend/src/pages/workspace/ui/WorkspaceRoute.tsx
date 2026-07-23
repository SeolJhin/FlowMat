import { Suspense, lazy } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useWorkflowCanvasQuery } from '../../../entities/workflow/api/useWorkflowCanvasQuery'
import { preloadWorkflowCanvasPage } from './workspacePreload'

const WorkflowCanvasPage = lazy(() =>
  preloadWorkflowCanvasPage().then((module) => ({ default: module.WorkflowCanvasPage }))
)

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
        <Link to="/" style={{ fontSize: 13, color: 'var(--accent)' }}>
          Back to home
        </Link>
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="workspace-loading">Loading workspace...</div>}>
      <WorkflowCanvasPage canvas={canvas} projectId={projectId} />
    </Suspense>
  )
}
