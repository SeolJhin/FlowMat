import { useState } from 'react'
import { useRunInstructionMutations, useRunInstructionQuery } from '../../../entities/production/api/useWorkInstructions'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { finishNote, progressText } from '../../inventory/model/workInstructionModel'

/**
 * The run's work instruction checklist (docs/domain/work-instruction.md): the released steps of the run's product, each
 * confirmed by an operator (with its value where the step records one). Hidden when the product has no instruction.
 */
export function RunInstructionChecklist({ runId }: { runId: string }) {
  const query = useRunInstructionQuery(runId)
  const { check, uncheck } = useRunInstructionMutations(runId)
  const [values, setValues] = useState<Record<string, string>>({})
  const checklist = query.data
  if (!checklist?.instruction) return null
  const instruction = checklist.instruction
  const done = new Map(checklist.checks.map((one) => [one.stepId, one]))
  const failure = check.isError ? check.error : uncheck.isError ? uncheck.error : null

  return (
    <section aria-label="Work instruction" style={{ marginTop: 16, border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
      <h4 style={{ margin: '0 0 4px' }}>Work instruction · {instruction.title} <code>v{instruction.revisionNo}</code></h4>
      <p role="status" style={{ margin: '0 0 6px', fontSize: 13, color: checklist.complete ? '#047857' : '#b45309' }}>
        {progressText(checklist)}
      </p>
      {instruction.documentUrl && <a href={instruction.documentUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>Open document</a>}
      {instruction.body && <p style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{instruction.body}</p>}
      <ol aria-label="Instruction steps" style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 6, fontSize: 13 }}>
        {instruction.steps.map((step) => {
          const confirmed = done.get(step.stepId)
          return (
            <li key={step.stepId}>
              <span style={{ textDecoration: confirmed ? 'line-through' : undefined }}>{step.text}</span>
              {!step.required && <span className="inspector-hint"> (optional)</span>}
              {confirmed ? (
                <span style={{ marginLeft: 6, color: '#047857' }}>
                  ✓ {confirmed.value ? `${step.valueLabel ?? 'value'} ${confirmed.value} · ` : ''}{confirmed.checkedBy} ·{' '}
                  {new Date(confirmed.checkedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                  {checklist.open && (
                    <button type="button" style={{ marginLeft: 6, fontSize: 11 }} disabled={uncheck.isPending}
                      onClick={() => uncheck.mutate(step.stepId)}>Undo</button>
                  )}
                </span>
              ) : checklist.open && (
                <span style={{ marginLeft: 6 }}>
                  {step.recordsValue && (
                    <input aria-label={step.valueLabel ?? `Value for step ${step.stepNo}`} value={values[step.stepId] ?? ''} maxLength={200}
                      style={{ width: 90, marginRight: 4 }} onChange={(event) => setValues({ ...values, [step.stepId]: event.target.value })} />
                  )}
                  <button type="button" style={{ fontSize: 11 }} disabled={check.isPending}
                    onClick={() => check.mutate({ stepId: step.stepId, value: values[step.stepId]?.trim() || null, note: null })}>Done</button>
                </span>
              )}
            </li>
          )
        })}
      </ol>
      {failure && <p role="alert" style={{ color: '#dc2626', fontSize: 12 }}>{errorMessage(failure)}</p>}
    </section>
  )
}

/** A reminder next to Finish while required steps are unconfirmed; the server refuses Finish when the instruction blocks it. */
export function ChecklistFinishNote({ runId }: { runId: string }) {
  const checklist = useRunInstructionQuery(runId).data
  const note = checklist ? finishNote(checklist) : null
  if (!note) return null
  return <p role="note" style={{ color: checklist?.instruction?.blocksFinish ? '#b91c1c' : '#b45309', fontSize: 12, margin: 0 }}>{note}</p>
}
