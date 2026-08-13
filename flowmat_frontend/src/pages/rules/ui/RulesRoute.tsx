import { Link, useParams } from 'react-router-dom'

export function RulesRoute() {
  const { projectId = '' } = useParams<{ projectId: string }>()

  return (
    <div style={{ padding: 32 }}>
      <Link to="/" style={{ fontSize: 13, color: 'var(--accent)' }}>Back to home</Link>
      <h1>Flow Rules</h1>
      <p style={{ color: 'var(--text)', opacity: 0.6 }}>
        Rule list for project <code>{projectId}</code>.
      </p>
      <p className="inspector-hint">This page is scheduled for a future sprint.</p>
    </div>
  )
}
