import { useState } from 'react'
import {
  useNotificationSubscriptionsQuery, useSetNotificationSubscriptionMutation, type NotificationTopic,
} from '../../../entities/notification/api/useNotificationSubscriptions'
import { errorMessage } from '../../../shared/lib/errorMessage'

const TOPICS: { topic: NotificationTopic; label: string; hint: string }[] = [
  { topic: 'stock_alert', label: 'Stock alerts', hint: 'When a stock alert opens in this project. The owner always gets these.' },
  { topic: 'ncr_check_overdue', label: 'Overdue NCR checks', hint: "When a closed NCR's effectiveness check passes its due day." },
  { topic: 'work_order_due', label: 'Work orders due', hint: 'When an approved or running work order is due within the days below.' },
]

/**
 * What the current person chooses to hear about in this project, on Home (docs/domain/notification.md NS1-NS9). Work given to
 * them and approvals always come; these are extra, and each person sets only their own.
 */
export function NotificationSubscriptionsPanel({ projectId }: { projectId: string }) {
  const query = useNotificationSubscriptionsQuery(projectId)
  const set = useSetNotificationSubscriptionMutation(projectId)
  // Null until typed: the field shows the saved days, or 3 before work orders are chosen.
  const [days, setDays] = useState<string | null>(null)
  // The box being saved shows the new choice at once; a refusal puts back what the server has.
  const [saving, setSaving] = useState<{ topic: NotificationTopic; subscribed: boolean } | null>(null)
  const rows = Array.isArray(query.data) ? query.data : []
  const due = rows.find((row) => row.topic === 'work_order_due')
  const shownDays = days ?? String(due?.daysAhead ?? 3)

  function choose(topic: NotificationTopic, subscribed: boolean) {
    setSaving({ topic, subscribed })
    set.mutate(
      { projectId, topic, subscribed, daysAhead: topic === 'work_order_due' && subscribed ? Number(shownDays) : undefined },
      {
        onSuccess: () => { if (topic === 'work_order_due') setDays(current => current === shownDays ? null : current) },
        onSettled: () => setSaving(null),
      },
    )
  }

  function saveDays() {
    if (!due?.subscribed || days === null || Number(days) === due.daysAhead) return
    const submittedDays = days
    set.mutate({ projectId, topic: 'work_order_due', subscribed: true, daysAhead: Number(submittedDays) },
      { onSuccess: () => setDays(current => current === submittedDays ? null : current) })
  }

  return (
    <section aria-label="Notifications" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
      <h2 style={{ margin: 0 }}>Notifications</h2>
      <p className="inspector-hint">
        Choose what else you hear about in this project, on Home. Work given to you and approvals always come.
      </p>
      {query.isError && <p role="alert">{errorMessage(query.error, 'Failed to load your notification choices.')}</p>}
      {TOPICS.map(({ topic, label, hint }) => {
        const row = rows.find((one) => one.topic === topic)
        const checked = saving?.topic === topic ? saving.subscribed : row?.subscribed ?? false
        return (
          <div key={topic} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', margin: '8px 0' }}>
            <label>
              <input type="checkbox" checked={checked} disabled={!row || set.isPending}
                onChange={(event) => choose(topic, event.target.checked)} />{' '}
              {label}
            </label>
            <span className="inspector-hint">{hint}</span>
            {topic === 'work_order_due' && (
              <label style={{ fontSize: 12 }}>
                Days before the planned end{' '}
                <input aria-label="Days before the planned end" type="number" min={0} max={30} step={1} value={shownDays}
                  style={{ width: 60 }} onChange={(event) => setDays(event.target.value)} onBlur={saveDays} />
              </label>
            )}
          </div>
        )
      })}
      {set.isError && <p role="alert">{errorMessage(set.error, 'Failed to save the notification choice.')}</p>}
    </section>
  )
}
