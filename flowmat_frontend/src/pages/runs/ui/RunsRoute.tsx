import { Link, useParams } from 'react-router-dom'

export function RunsRoute() {
  const { projectId = '' } = useParams<{ projectId: string }>()

  return (
    <div style={{ padding: 32 }}>
      <Link to="/" style={{ fontSize: 13, color: 'var(--accent)' }}>Back to home</Link>
      <h1>Production Runs</h1>
      <p style={{ color: 'var(--text)', opacity: 0.6 }}>
        Run history for project <code>{projectId}</code>.
      </p>
      <p className="inspector-hint">This page is scheduled for a future sprint.</p>
    </div>
  )
}
