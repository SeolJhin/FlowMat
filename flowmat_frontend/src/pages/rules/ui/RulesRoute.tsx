import { useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useFlowRulesQuery } from '../../../entities/rule/api/useFlowRulesQuery'
import { useCreateFlowRuleMutation } from '../../../entities/rule/api/useCreateFlowRuleMutation'
import { useUpdateFlowRuleMutation } from '../../../entities/rule/api/useUpdateFlowRuleMutation'
import { useDeleteFlowRuleMutation } from '../../../entities/rule/api/useDeleteFlowRuleMutation'
import { useWorkflowsQuery } from '../../../entities/workflow/api/useWorkflowsQuery'
import { useItemsQuery } from '../../../entities/catalog/api/useItemsQuery'
import { useInventoriesQuery } from '../../../entities/inventory/api/useInventoriesQuery'
import { errorMessage } from '../../../shared/lib/errorMessage'
import type { FlowRuleDto } from '../../../shared/types/api'

// Mirrors FlowRuleServiceImpl.ALLOWED_TARGET_TYPES on the backend.
const TARGET_TYPES = [
  'project',
  'workflow',
  'item',
  'inventory',
  'run',
  'process',
  'process_io',
  'process_connection',
] as const
type TargetType = (typeof TARGET_TYPES)[number]

const CONDITION_TYPES = ['expression', 'always', 'never']
// validate/block/reject reject the request when the condition matches; other action types are stored but not enforced yet.
const ACTION_TYPES = ['validate', 'block', 'reject']

const FACT_HINTS = [
  'operation (run_start · run_item_record · run_finish)',
  'plannedOutputQty · runType — run start',
  'requestQuantity · direction · item.itemCode — item record',
  'actualOutputQty · finishedBy — run finish',
]

interface RuleForm {
  ruleName: string
  ruleDesc: string
  targetType: TargetType
  targetId: string
  conditionType: string
  conditionExpression: string
  actionType: string
  priority: string
  enabled: boolean
}

const EMPTY_FORM: RuleForm = {
  ruleName: '',
  ruleDesc: '',
  targetType: 'project',
  targetId: '',
  conditionType: 'expression',
  conditionExpression: '',
  actionType: 'validate',
  priority: '0',
  enabled: true,
}

const cell = { padding: '8px 6px' } as const

export function RulesRoute() {
  const { projectId = '' } = useParams<{ projectId: string }>()
  const rulesQuery = useFlowRulesQuery(projectId)
  const workflowsQuery = useWorkflowsQuery(projectId)
  const itemsQuery = useItemsQuery(projectId)
  const inventoriesQuery = useInventoriesQuery(projectId)

  const createMutation = useCreateFlowRuleMutation(projectId)
  const updateMutation = useUpdateFlowRuleMutation(projectId)
  const deleteMutation = useDeleteFlowRuleMutation(projectId)

  const [editingRule, setEditingRule] = useState<FlowRuleDto | null>(null)
  const [form, setForm] = useState<RuleForm>(EMPTY_FORM)
  const [filter, setFilter] = useState<'all' | TargetType>('all')

  const rules = rulesQuery.data ?? []
  const visibleRules = filter === 'all' ? rules : rules.filter((rule) => rule.targetType === filter)

  const targetOptions = useMemo(() => {
    const items = itemsQuery.data ?? []
    const itemName = new Map(items.map((item) => [item.itemId, `${item.itemCode} · ${item.itemName}`]))
    return {
      workflow: (workflowsQuery.data ?? []).map((wf) => ({ id: wf.workflowId, label: wf.workflowName })),
      item: items.map((item) => ({ id: item.itemId, label: `${item.itemCode} · ${item.itemName}` })),
      inventory: (inventoriesQuery.data ?? []).map((inv) => ({
        id: inv.inventoryId,
        label: `${itemName.get(inv.itemId) ?? inv.itemId}${inv.location ? ` @ ${inv.location}` : ''}`,
      })),
    } as Partial<Record<TargetType, { id: string; label: string }[]>>
  }, [workflowsQuery.data, itemsQuery.data, inventoriesQuery.data])

  function describeTarget(rule: FlowRuleDto): string {
    if (rule.targetType === 'project') return 'This project'
    const match = targetOptions[rule.targetType as TargetType]?.find((option) => option.id === rule.targetId)
    return match?.label ?? rule.targetId
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingRule(null)
    createMutation.reset()
    updateMutation.reset()
  }

  function startEdit(rule: FlowRuleDto) {
    setEditingRule(rule)
    setForm({
      ruleName: rule.ruleName,
      ruleDesc: rule.ruleDesc ?? '',
      targetType: (TARGET_TYPES as readonly string[]).includes(rule.targetType)
        ? (rule.targetType as TargetType)
        : 'project',
      targetId: rule.targetType === 'project' ? '' : rule.targetId,
      conditionType: rule.conditionType,
      conditionExpression: rule.conditionExpression,
      actionType: rule.actionType,
      priority: String(rule.priority ?? 0),
      enabled: rule.enabledYn === 'Y',
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const payload = {
      ruleName: form.ruleName.trim(),
      ruleDesc: form.ruleDesc.trim(),
      targetType: form.targetType,
      targetId: form.targetType === 'project' ? projectId : form.targetId.trim(),
      conditionType: form.conditionType,
      // The backend requires a non-blank expression even when the condition type ignores it.
      conditionExpression: form.conditionType === 'expression' ? form.conditionExpression.trim() : form.conditionType,
      actionType: form.actionType,
      priority: Number(form.priority) || 0,
      enabledYn: form.enabled ? 'Y' : 'N',
    }
    try {
      if (editingRule) {
        await updateMutation.mutateAsync({ ruleId: editingRule.ruleId, ...payload })
      } else {
        await createMutation.mutateAsync({ projectId, ...payload })
      }
      resetForm()
    } catch {
      // Surfaced through the mutation error state below the form.
    }
  }

  function toggleEnabled(rule: FlowRuleDto) {
    updateMutation.mutate({ ruleId: rule.ruleId, enabledYn: rule.enabledYn === 'Y' ? 'N' : 'Y' })
  }

  function handleDelete(ruleId: string) {
    if (!window.confirm('Delete this rule?')) return
    deleteMutation.mutate(ruleId, {
      onSuccess: () => {
        if (editingRule?.ruleId === ruleId) resetForm()
      },
    })
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const saveError = createMutation.error ?? updateMutation.error
  const options = targetOptions[form.targetType]

  return (
    <div style={{ padding: 32, maxWidth: 1120, margin: '0 auto' }}>
      <Link to="/" style={{ fontSize: 13, color: 'var(--accent)' }}>Back to home</Link>
      <h1>Flow Rules</h1>
      <p style={{ color: 'var(--text)', opacity: 0.6, marginTop: 0 }}>
        Rules are checked when runs start, record items, and finish. A rule whose condition matches blocks the request
        with its description as the error message.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
        <section>
          <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', marginBottom: 12, fontSize: 13 }}>
            <span>Target</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value as 'all' | TargetType)}>
              <option value="all">all ({rules.length})</option>
              {TARGET_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type} ({rules.filter((rule) => rule.targetType === type).length})
                </option>
              ))}
            </select>
          </label>

          {rulesQuery.isLoading && <p>Loading rules...</p>}
          {rulesQuery.isError && (
            <p style={{ color: '#dc2626' }}>{errorMessage(rulesQuery.error, 'Failed to load rules.')}</p>
          )}
          {!rulesQuery.isLoading && visibleRules.length === 0 && (
            <p className="inspector-hint">No rules yet. Add one from the form on the right.</p>
          )}
          {visibleRules.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                  <th style={cell}>On</th>
                  <th style={cell}>Name</th>
                  <th style={cell}>Target</th>
                  <th style={cell}>Condition</th>
                  <th style={cell}>Action</th>
                  <th style={cell}>Priority</th>
                  <th style={cell}></th>
                </tr>
              </thead>
              <tbody>
                {visibleRules.map((rule) => (
                  <tr
                    key={rule.ruleId}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: editingRule?.ruleId === rule.ruleId ? 'var(--accent-bg)' : undefined,
                      opacity: rule.enabledYn === 'Y' ? 1 : 0.55,
                    }}
                  >
                    <td style={cell}>
                      <input
                        type="checkbox"
                        aria-label={`Enable ${rule.ruleName}`}
                        checked={rule.enabledYn === 'Y'}
                        disabled={updateMutation.isPending}
                        onChange={() => toggleEnabled(rule)}
                      />
                    </td>
                    <td style={cell}>
                      <div>{rule.ruleName}</div>
                      {rule.ruleDesc && <div style={{ fontSize: 12, opacity: 0.6 }}>{rule.ruleDesc}</div>}
                    </td>
                    <td style={cell}>
                      <div style={{ fontSize: 11, opacity: 0.6 }}>{rule.targetType}</div>
                      <div>{describeTarget(rule)}</div>
                    </td>
                    <td style={cell}>
                      {rule.conditionType === 'expression' ? <code>{rule.conditionExpression}</code> : rule.conditionType}
                    </td>
                    <td style={{ ...cell, opacity: 0.7 }}>{rule.actionType}</td>
                    <td style={{ ...cell, opacity: 0.7 }}>{rule.priority}</td>
                    <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                      <button type="button" onClick={() => startEdit(rule)} style={{ marginRight: 4, fontSize: 12 }}>
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(rule.ruleId)}
                        disabled={deleteMutation.isPending}
                        style={{ fontSize: 12, color: '#dc2626', border: '1px solid #fca5a5', background: '#fef2f2' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {deleteMutation.isError && (
            <p style={{ color: '#dc2626', fontSize: 12 }}>
              {errorMessage(deleteMutation.error, 'Failed to delete rule. Only project owners can delete rules.')}
            </p>
          )}
        </section>

        <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
          <h3 style={{ marginTop: 0 }}>{editingRule ? 'Edit Rule' : 'Add Rule'}</h3>
          <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: 10 }}>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>Name *</span>
              <input
                value={form.ruleName}
                onChange={(e) => setForm((f) => ({ ...f, ruleName: e.target.value }))}
                placeholder="e.g. Cap planned output"
                required
              />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>Error message</span>
              <input
                value={form.ruleDesc}
                onChange={(e) => setForm((f) => ({ ...f, ruleDesc: e.target.value }))}
                placeholder="Shown to the user when the rule blocks"
              />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span>Target type</span>
              <select
                value={form.targetType}
                onChange={(e) => setForm((f) => ({ ...f, targetType: e.target.value as TargetType, targetId: '' }))}
              >
                {TARGET_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            {form.targetType !== 'project' && (
              <label style={{ display: 'grid', gap: 4 }}>
                <span>Target *</span>
                {options ? (
                  <select
                    value={form.targetId}
                    onChange={(e) => setForm((f) => ({ ...f, targetId: e.target.value }))}
                    required
                  >
                    <option value="" disabled>Select {form.targetType}</option>
                    {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                ) : (
                  <input
                    value={form.targetId}
                    onChange={(e) => setForm((f) => ({ ...f, targetId: e.target.value }))}
                    placeholder={`${form.targetType} id`}
                    required
                  />
                )}
              </label>
            )}
            <label style={{ display: 'grid', gap: 4 }}>
              <span>Condition</span>
              <select value={form.conditionType} onChange={(e) => setForm((f) => ({ ...f, conditionType: e.target.value }))}>
                {CONDITION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            {form.conditionType === 'expression' && (
              <label style={{ display: 'grid', gap: 4 }}>
                <span>Blocks when *</span>
                <input
                  value={form.conditionExpression}
                  onChange={(e) => setForm((f) => ({ ...f, conditionExpression: e.target.value }))}
                  placeholder="plannedOutputQty > 1000"
                  style={{ fontFamily: 'monospace' }}
                  required
                />
                <span style={{ fontSize: 11, opacity: 0.6, lineHeight: 1.5 }}>
                  Comparisons <code>fact op value</code> with ==, !=, &gt;, &gt;=, &lt;, &lt;=, combined with
                  {' '}<code>&amp;&amp;</code>/<code>and</code>, <code>||</code>/<code>or</code>, <code>!</code>/<code>not</code> and ( ).
                  Quote text that contains spaces: <code>status == 'on hold'</code>.
                  <br />
                  Facts: {FACT_HINTS.join('; ')}
                </span>
              </label>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 8 }}>
              <label style={{ display: 'grid', gap: 4 }}>
                <span>Action</span>
                <select value={form.actionType} onChange={(e) => setForm((f) => ({ ...f, actionType: e.target.value }))}>
                  {ACTION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  {!ACTION_TYPES.includes(form.actionType) && <option value={form.actionType}>{form.actionType}</option>}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span>Priority</span>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                />
              </label>
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              />
              <span>Enabled</span>
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : editingRule ? 'Save' : 'Add'}
              </button>
              {editingRule && (
                <button type="button" onClick={resetForm} style={{ background: 'transparent' }}>
                  Cancel
                </button>
              )}
            </div>
            {saveError && (
              <p style={{ color: '#dc2626', fontSize: 12, margin: 0 }}>{errorMessage(saveError, 'Failed to save rule.')}</p>
            )}
          </form>
        </section>
      </div>
    </div>
  )
}
