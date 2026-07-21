import { useParams, Link } from 'react-router-dom'

export function RunsRoute() {
  const { projectId = '' } = useParams<{ projectId: string }>()

  return (
    <div style={{ padding: 32 }}>
      <Link to="/" style={{ fontSize: 13, color: 'var(--accent)' }}>← 홈</Link>
      <h1>생산 실행 / 시뮬레이션</h1>
      <p style={{ color: 'var(--text)', opacity: 0.6 }}>
        프로젝트 <code>{projectId}</code>의 실행 이력입니다.
      </p>
      <p className="inspector-hint">이 페이지는 다음 스프린트에서 구현됩니다.</p>
    </div>
  )
}
