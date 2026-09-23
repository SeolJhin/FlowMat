import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApplyProcessTemplateMutation } from '../../../entities/workflow/api/useApplyProcessTemplateMutation'
import { useProcessTemplatesQuery } from '../../../entities/workflow/api/useProcessTemplatesQuery'
import {
  useDeleteProcessTemplateMutation,
  useSaveProcessTemplateMutation,
} from '../../../entities/workflow/api/useSaveProcessTemplateMutation'
import { useWorkflowsQuery } from '../../../entities/workflow/api/useWorkflowsQuery'
import { useMyPermissionsQuery } from '../../../entities/auth/api/useMyPermissionsQuery'
import { errorMessage } from '../../../shared/lib/errorMessage'
import type { ProcessTemplateDto } from '../../../shared/types/api'

// Mirrors the backend NodeType enum.
const NODE_TYPES = ['process', 'equipment', 'storage', 'input', 'output']

interface TemplateForm {
  templateName: string
  templateCategory: string
  templateType: string
  defaultColorScheme: string
  defaultDesc: string
  isPublic: boolean
  sortOrder: string
}

const EMPTY_FORM: TemplateForm = {
  templateName: '',
  templateCategory: '',
  templateType: 'process',
  defaultColorScheme: '',
  defaultDesc: '',
  isPublic: true,
  sortOrder: '0',
}

export function TemplatesRoute() {
  const { projectId = '' } = useParams<{ projectId: string }>()
  const templatesQuery = useProcessTemplatesQuery()
  const templates = templatesQuery.data ?? []
  const workflowsQuery = useWorkflowsQuery(projectId)
  const workflows = workflowsQuery.data ?? []
  const canManage = useMyPermissionsQuery().data?.canManageTemplates ?? false

  const [selectedWorkflowId, setSelectedWorkflowId] = useState('')
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [applyNotice, setApplyNotice] = useState<string | null>(null)
  const applyMutation = useApplyProcessTemplateMutation(selectedWorkflowId)

  const saveMutation = useSaveProcessTemplateMutation()
  const deleteMutation = useDeleteProcessTemplateMutation()
  const [editing, setEditing] = useState<ProcessTemplateDto | null>(null)
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM)

  async function handleApply(e: FormEvent, template: ProcessTemplateDto) {
    e.preventDefault()
    if (!selectedWorkflowId) return
    setApplyingId(template.templateId)
    setApplyNotice(null)
    try {
      await applyMutation.mutateAsync({ templateId: template.templateId, workflowId: selectedWorkflowId })
      setApplyNotice(`Added "${template.templateName}" to the workflow. Open the canvas to review it.`)
    } catch {
      // Surfaced through applyMutation.error below.
    } finally {
      setApplyingId(null)
    }
  }

  function resetForm() {
    setEditing(null)
    setForm(EMPTY_FORM)
    saveMutation.reset()
  }

  function startEdit(template: ProcessTemplateDto) {
    setEditing(template)
    setForm({
      templateName: template.templateName,
      templateCategory: template.templateCategory,
      templateType: template.templateType,
      defaultColorScheme: template.defaultColorScheme ?? '',
      defaultDesc: template.defaultDesc ?? '',
      isPublic: template.publicYn === 'Y',
      sortOrder: String(template.sortOrder ?? 0),
    })
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    try {
      await saveMutation.mutateAsync({
        templateId: editing?.templateId,
        templateName: form.templateName.trim(),
        templateCategory: form.templateCategory.trim(),
        templateType: form.templateType,
        defaultColorScheme: form.defaultColorScheme.trim() || undefined,
        defaultDesc: form.defaultDesc.trim() || undefined,
        publicYn: form.isPublic ? 'Y' : 'N',
        sortOrder: Number(form.sortOrder) || 0,
      })
      resetForm()
    } catch {
      // Surfaced through saveMutation.error below.
    }
  }

  function handleDelete(template: ProcessTemplateDto) {
    if (!window.confirm(`Delete template "${template.templateName}"? Existing nodes keep their data.`)) return
    deleteMutation.mutate(template.templateId, {
      onSuccess: () => {
        if (editing?.templateId === template.templateId) resetForm()
      },
    })
  }

  return (
    <div style={{ padding: 32, maxWidth: canManage ? 1180 : 900, margin: '0 auto' }}>
      <Link to="/" style={{ fontSize: 13, color: 'var(--accent)' }}>Back to home</Link>
      <h1>Process Templates</h1>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontWeight: 500 }}>Target workflow</span>
        <select value={selectedWorkflowId} onChange={(e) => setSelectedWorkflowId(e.target.value)} style={{ minWidth: 200 }}>
          <option value="">Select...</option>
          {workflows.map((workflow) => (
            <option key={workflow.workflowId} value={workflow.workflowId}>{workflow.workflowName}</option>
          ))}
        </select>
      </label>
      {applyNotice && <p style={{ color: '#047857', fontSize: 13 }}>{applyNotice}</p>}
      {applyMutation.isError && (
        <p style={{ color: '#dc2626', fontSize: 13 }}>{errorMessage(applyMutation.error, 'Failed to apply template.')}</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: canManage ? '1fr 340px' : '1fr', gap: 24, alignItems: 'start' }}>
        <section>
          {templatesQuery.isLoading && <p>Loading templates...</p>}
          {templatesQuery.isError && (
            <p style={{ color: '#dc2626' }}>{errorMessage(templatesQuery.error, 'Failed to load templates.')}</p>
          )}
          {!templatesQuery.isLoading && templates.length === 0 && <p className="inspector-hint">No templates available.</p>}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {templates.map((template) => (
              <div
                key={template.templateId}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 16,
                  display: 'grid',
                  gap: 8,
                  background: editing?.templateId === template.templateId ? 'var(--accent-bg)' : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{template.templateName}</span>
                  {template.publicYn !== 'Y' && (
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, background: 'var(--border)' }}>
                      private
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {template.templateCategory} | {template.templateType}
                </div>
                {template.defaultDesc && <div style={{ fontSize: 12, opacity: 0.6 }}>{template.defaultDesc}</div>}
                <form onSubmit={(e) => void handleApply(e, template)}>
                  <button
                    type="submit"
                    disabled={!selectedWorkflowId || applyingId === template.templateId}
                    style={{ width: '100%', marginTop: 4 }}
                  >
                    {applyingId === template.templateId ? 'Applying...' : 'Apply to Canvas'}
                  </button>
                </form>
                {canManage && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" onClick={() => startEdit(template)} style={{ flex: 1, fontSize: 12 }}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(template)}
                      disabled={deleteMutation.isPending}
                      style={{ flex: 1, fontSize: 12, color: '#dc2626', border: '1px solid #fca5a5', background: '#fef2f2' }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {deleteMutation.isError && (
            <p style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(deleteMutation.error, 'Failed to delete template.')}</p>
          )}
        </section>

        {canManage && (
          <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
            <h3 style={{ marginTop: 0 }}>{editing ? 'Edit Template' : 'New Template'}</h3>
            <form onSubmit={(e) => void handleSave(e)} style={{ display: 'grid', gap: 10 }}>
              <label style={{ display: 'grid', gap: 4 }}>
                <span>Name *</span>
                <input
                  value={form.templateName}
                  onChange={(e) => setForm((f) => ({ ...f, templateName: e.target.value }))}
                  required
                />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span>Category *</span>
                <input
                  value={form.templateCategory}
                  onChange={(e) => setForm((f) => ({ ...f, templateCategory: e.target.value }))}
                  placeholder="e.g. assembly, packaging"
                  required
                />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span>Node type</span>
                <select value={form.templateType} onChange={(e) => setForm((f) => ({ ...f, templateType: e.target.value }))}>
                  {NODE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span>Default color</span>
                <input
                  value={form.defaultColorScheme}
                  onChange={(e) => setForm((f) => ({ ...f, defaultColorScheme: e.target.value }))}
                  placeholder="e.g. sky, emerald"
                />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span>Description</span>
                <textarea
                  rows={3}
                  value={form.defaultDesc}
                  onChange={(e) => setForm((f) => ({ ...f, defaultDesc: e.target.value }))}
                />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8, alignItems: 'end' }}>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
                  />
                  <span>Visible to all users</span>
                </label>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span>Order</span>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  />
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Saving...' : editing ? 'Save' : 'Create'}
                </button>
                {editing && (
                  <button type="button" onClick={resetForm} style={{ background: 'transparent' }}>
                    Cancel
                  </button>
                )}
              </div>
              {saveMutation.isError && (
                <p style={{ color: '#dc2626', fontSize: 12, margin: 0 }}>
                  {errorMessage(saveMutation.error, 'Failed to save template.')}
                </p>
              )}
            </form>
          </section>
        )}
      </div>
    </div>
  )
}
