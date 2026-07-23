import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApplyProcessTemplateMutation } from '../../../entities/workflow/api/useApplyProcessTemplateMutation'
import { useProcessTemplatesQuery } from '../../../entities/workflow/api/useProcessTemplatesQuery'
import { useWorkflowsQuery } from '../../../entities/workflow/api/useWorkflowsQuery'

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
      alert('Template applied. Open the workflow canvas to review the result.')
    } finally {
      setApplyingId(null)
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      <Link to="/" style={{ fontSize: 13, color: 'var(--accent)' }}>Back to home</Link>
      <h1>Process Templates</h1>
      <p style={{ color: 'var(--text)', opacity: 0.6, marginTop: 0 }}>
        Project <code>{projectId}</code>
      </p>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <span style={{ fontWeight: 500 }}>Target workflow</span>
        <select value={selectedWorkflowId} onChange={(e) => setSelectedWorkflowId(e.target.value)} style={{ minWidth: 200 }}>
          <option value="">Select...</option>
          {workflows.map((workflow) => (
            <option key={workflow.workflowId} value={workflow.workflowId}>{workflow.workflowName}</option>
          ))}
        </select>
      </label>

      {templatesQuery.isLoading && <p>Loading templates...</p>}
      {templatesQuery.isError && <p style={{ color: '#dc2626' }}>Failed to load templates.</p>}
      {!templatesQuery.isLoading && templates.length === 0 && <p className="inspector-hint">No templates available.</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {templates.map((template) => (
          <div
            key={template.templateId}
            style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'grid', gap: 8 }}
          >
            <div style={{ fontWeight: 600, fontSize: 15 }}>{template.templateName}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {template.templateCategory} | {template.templateType}
            </div>
            {template.defaultDesc && <div style={{ fontSize: 12, opacity: 0.6 }}>{template.defaultDesc}</div>}
            <form onSubmit={(e) => void handleApply(e, template.templateId)}>
              <button type="submit" disabled={!selectedWorkflowId || applyingId === template.templateId} style={{ width: '100%', marginTop: 4 }}>
                {applyingId === template.templateId ? 'Applying...' : 'Apply to Canvas'}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  )
}
