import { Link } from 'react-router-dom'
import { useNotificationMutations, useNotificationsQuery, useUnreadNotificationCountQuery } from '../../../entities/notification/api/useNotifications'
import { errorMessage } from '../../../shared/lib/errorMessage'
import { notificationLink } from '../model/notificationModel'

/** How many are shown; the server keeps the newest hundred. */
const SHOWN = 20

/**
 * Work given to the person, newest first (docs/domain/notification.md NT5): an NCR action or a warehouse task someone else
 * gave them. Opening one marks it read; so does Mark read, or Mark all read for every unread one.
 */
export function NotificationsPanel({ userId }: { userId: string }) {
  const listQuery = useNotificationsQuery(userId)
  const countQuery = useUnreadNotificationCountQuery(userId)
  const { markRead, markAllRead } = useNotificationMutations(userId)
  const notifications = listQuery.data ?? []
  const unreadCount = countQuery.data
  const unread = (unreadCount ?? 0) > 0 || notifications.some((notification) => !notification.read)
  const summary = countQuery.isError ? 'Unread count unavailable'
    : unreadCount === undefined ? 'Checking unread...' : unreadCount === 0 ? 'All read' : `${unreadCount} unread`
  const failure = listQuery.isError ? listQuery.error : countQuery.isError ? countQuery.error
    : markRead.isError ? markRead.error : markAllRead.isError ? markAllRead.error : null

  return (
    <section aria-label="Notifications" className="mb-8 rounded-2xl bg-[#1a1b24] p-5">
      <div className="mb-3 flex flex-wrap items-baseline gap-3">
        <h2 className="text-[13px] font-semibold">Notifications</h2>
        <span className="text-[12px] text-[#9694a3]">{summary}</span>
        {unread && (
          <button type="button" disabled={markAllRead.isPending} onClick={() => markAllRead.mutate()}
            className="ml-auto rounded-[10px] px-3 py-1 text-[12px] text-[#9b82ff] transition hover:bg-[#202130]">
            Mark all read
          </button>
        )}
      </div>
      {failure && <p role="alert" className="mb-2 text-[12.5px] text-[#f87171]">{errorMessage(failure)}</p>}
      {listQuery.isSuccess && notifications.length === 0 && (
        <p className="text-[13px] text-[#9694a3]">
          {(unreadCount ?? 0) > 0 ? 'Unread notifications are outside this list.' : 'Nothing new for you.'}
        </p>
      )}
      {notifications.length > 0 && (
        <ul className="grid gap-2">
          {notifications.slice(0, SHOWN).map((notification) => {
            const link = notificationLink(notification)
            return (
              <li key={notification.notificationId} aria-label={notification.title}
                className={`rounded-[11px] border px-3.5 py-2.5 ${notification.read ? 'border-[#26272f]' : 'border-[#7c5cff]'}`}>
                <div className="flex flex-wrap items-baseline gap-2">
                  {!notification.read && <span className="text-[11px] font-semibold text-[#9b82ff]">New</span>}
                  <strong className="text-[13px]">{notification.title}</strong>
                  <span className="ml-auto text-[11px] text-[#5f5d6b]">{new Date(notification.createdAt).toLocaleString()}</span>
                </div>
                {notification.body && <p className="mt-0.5 text-[12.5px] text-[#9694a3]">{notification.body}</p>}
                <div className="mt-1 flex gap-3 text-[12px]">
                  {link && (
                    <Link to={link} className="text-[#9b82ff] hover:underline"
                      onClick={() => { if (!notification.read) markRead.mutate(notification.notificationId) }}>
                      Open
                    </Link>
                  )}
                  {!notification.read && (
                    <button type="button" disabled={markRead.isPending} className="text-[#9694a3] hover:text-[#f2f1f6]"
                      onClick={() => markRead.mutate(notification.notificationId)}>
                      Mark read
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
