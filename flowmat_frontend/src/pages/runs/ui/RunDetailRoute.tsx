import { Link, useParams } from 'react-router-dom'

export function RunDetailRoute() {
  const { projectId = '', runId = '' } = useParams<{ projectId: string; runId: string }>()

  return (
    <div style={{ padding: 32 }}>
      <Link to={`/projects/${projectId}/runs`} style={{ fontSize: 13, color: 'var(--accent)' }}>
        Back to runs
      </Link>
      <h1>Run Detail</h1>
      <p style={{ color: 'var(--text)', opacity: 0.6 }}>
        Run ID: <code>{runId}</code>
      </p>
      <p className="inspector-hint">This page is scheduled for a future sprint.</p>
    </div>
  )
}
