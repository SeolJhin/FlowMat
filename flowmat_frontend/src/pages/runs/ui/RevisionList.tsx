import { useRetireWorkflowRevisionMutation } from '../../../entities/workflow/api/useWorkflowRevisions'
import { errorMessage } from '../../../shared/lib/errorMessage'
import type { WorkflowRevisionDto } from '../../../shared/types/api'
import { revisionCounts, revisionLine } from '../model/revisionModel'

/**
 * Every revision of the workflow, newest first, with retiring (docs/domain/workflow-revision.md V4·V5): a retired
 * revision starts no new runs, and runs already on it keep following it.
 */
export function RevisionList({ workflowId, revisions }: { workflowId: string; revisions: WorkflowRevisionDto[] }) {
  const retire = useRetireWorkflowRevisionMutation(workflowId)
  if (revisions.length === 0) return null
  return (
    <details style={{ fontSize: 12 }}>
      <summary>Revisions ({revisionCounts(revisions)})</summary>
      <ul aria-label="Workflow revisions" style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', display: 'grid', gap: 4 }}>
        {revisions.map((revision) => (
          <li key={revision.workflowRevisionId} aria-label={`v${revision.revisionNo} ${revision.status}`}
            style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', opacity: revision.status === 'retired' ? 0.6 : 1 }}>
            <strong>v{revision.revisionNo}</strong>
            <span>{revisionLine(revision)}</span>
            {revision.status === 'published' && (
              <button type="button" style={{ fontSize: 11 }} disabled={retire.isPending} onClick={() => {
                if (window.confirm(`Retire v${revision.revisionNo}? New runs can no longer start on it; runs already on it keep it.`)) {
                  retire.mutate(revision.workflowRevisionId)
                }
              }}>Retire</button>
            )}
          </li>
        ))}
      </ul>
      {retire.isError && (
        <p role="alert" style={{ color: '#dc2626', margin: '4px 0 0' }}>{errorMessage(retire.error, 'The revision could not be retired.')}</p>
      )}
    </details>
  )
}
