import { useState, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useProcessTemplatesQuery } from '../../../entities/workflow/api/useProcessTemplatesQuery'
import { useWorkflowsQuery } from '../../../entities/workflow/api/useWorkflowsQuery'
import { useApplyProcessTemplateMutation } from '../../../entities/workflow/api/useApplyProcessTemplateMutation'

export function TemplatesRoute() {
  const { projectId = '' } = useParams<{ projectId: string }>()
  const templatesQuery = useProcessTemplatesQuery()
  const templates = templatesQuery.data ?? []
  const workflowsQuery = useWorkflowsQuery(projectId)
  const workflows = workflowsQuery.data ?? []

  const [selectedWorkflowId, setSelectedWorkflowId] = useState('')
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const applyMutation = useApplyProcessTemplateMutation(selectedWorkflowId)

  async function handleApply(e: FormEvent, templateId: string) {
    e.preventDefault()
    if (!selectedWorkflowId) return
    setApplyingId(templateId)
    try {
      await applyMutation.mutateAsync({ templateId, workflowId: selectedWorkflowId })
      alert('템플릿이 적용됐습니다. 해당 워크플로우 캔버스를 확인하세요.')
    } finally {
      setApplyingId(null)
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      <Link to="/" style={{ fontSize: 13, color: 'var(--accent)' }}>← 홈</Link>
      <h1>프로세스 템플릿</h1>
      <p style={{ color: 'var(--text)', opacity: 0.6, marginTop: 0 }}>프로젝트 <code>{projectId}</code></p>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <span style={{ fontWeight: 500 }}>적용할 워크플로우:</span>
        <select
          value={selectedWorkflowId}
          onChange={(e) => setSelectedWorkflowId(e.target.value)}
          style={{ minWidth: 200 }}
        >
          <option value="">선택…</option>
          {workflows.map((wf) => (
            <option key={wf.workflowId} value={wf.workflowId}>{wf.workflowName}</option>
          ))}
        </select>
      </label>

      {templatesQuery.isLoading && <p>불러오는 중…</p>}
      {templatesQuery.isError && <p style={{ color: '#dc2626' }}>템플릿 불러오기 실패</p>}
      {!templatesQuery.isLoading && templates.length === 0 && (
        <p className="inspector-hint">등록된 템플릿이 없습니다.</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {templates.map((tpl) => (
          <div
            key={tpl.templateId}
            style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'grid', gap: 8 }}
          >
            <div style={{ fontWeight: 600, fontSize: 15 }}>{tpl.templateName}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {tpl.templateCategory} · {tpl.templateType}
            </div>
            {tpl.defaultDesc && (
              <div style={{ fontSize: 12, opacity: 0.6 }}>{tpl.defaultDesc}</div>
            )}
            <form onSubmit={(e) => void handleApply(e, tpl.templateId)}>
              <button
                type="submit"
                disabled={!selectedWorkflowId || applyingId === tpl.templateId}
                style={{ width: '100%', marginTop: 4 }}
              >
                {applyingId === tpl.templateId ? '적용 중…' : '캔버스에 적용'}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  )
}
