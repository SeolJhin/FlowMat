import { useParams, Link } from 'react-router-dom'

export function TemplatesRoute() {
  const { projectId = '' } = useParams<{ projectId: string }>()

  return (
    <div style={{ padding: 32 }}>
      <Link to="/" style={{ fontSize: 13, color: 'var(--accent)' }}>← 홈</Link>
      <h1>프로세스 템플릿</h1>
      <p style={{ color: 'var(--text)', opacity: 0.6 }}>
        프로젝트 <code>{projectId}</code>의 템플릿 목록입니다.
      </p>
      <p className="inspector-hint">이 페이지는 다음 스프린트에서 구현됩니다.</p>
    </div>
  )
}
