import { useParams, Link } from 'react-router-dom'

export function RunDetailRoute() {
  const { projectId = '', runId = '' } = useParams<{ projectId: string; runId: string }>()

  return (
    <div style={{ padding: 32 }}>
      <Link to={`/projects/${projectId}/runs`} style={{ fontSize: 13, color: 'var(--accent)' }}>
        ← 실행 목록
      </Link>
      <h1>실행 상세</h1>
      <p style={{ color: 'var(--text)', opacity: 0.6 }}>Run ID: <code>{runId}</code></p>
      <p className="inspector-hint">이 페이지는 다음 스프린트에서 구현됩니다.</p>
    </div>
  )
}
