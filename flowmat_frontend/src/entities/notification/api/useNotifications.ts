import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

/** One of the current person's notifications (docs/domain/notification.md NT3). */
export interface NotificationDto {
  notificationId: string
  /** What happened: ncr_action, warehouse_task. */
  type: string
  title: string
  body: string | null
  projectId: string | null
  /** What to open: nonconformity or warehouse_task, with refId. */
  refType: string | null
  refId: string | null
  read: boolean
  readAt: string | null
  createdAt: string
}

/** Per person, so signing in as someone else never shows the last person's list. */
const notificationsKey = (userId: string) => ['notifications', userId] as const

/** The newest hundred, newest first; read again every minute while shown. */
export function useNotificationsQuery(userId: string) {
  return useQuery<NotificationDto[]>({
    queryKey: notificationsKey(userId),
    queryFn: async () => unwrapApiResponse(await httpClient.get<ApiEnvelope<NotificationDto[]>>('/notifications')),
    enabled: Boolean(userId),
    refetchInterval: 60_000,
  })
}

/** The count includes readable notifications outside the newest hundred in the list. */
export function useUnreadNotificationCountQuery(userId: string) {
  return useQuery<number>({
    queryKey: [...notificationsKey(userId), 'unread-count'],
    queryFn: async () => {
      const result = unwrapApiResponse(await httpClient.get<ApiEnvelope<{ unread: number }>>('/notifications/unread-count'))
      if (!Number.isSafeInteger(result?.unread) || result.unread < 0) {
        throw new Error('The notification unread count is invalid.')
      }
      return result.unread
    },
    enabled: Boolean(userId),
    refetchInterval: 60_000,
  })
}

/** Marking one or all read; both the list and the count are read again. */
export function useNotificationMutations(userId: string) {
  const queryClient = useQueryClient()
  const onSuccess = () => void queryClient.invalidateQueries({ queryKey: notificationsKey(userId) })
  return {
    markRead: useMutation({
      mutationFn: async (notificationId: string) =>
        unwrapApiResponse(await httpClient.post<ApiEnvelope<NotificationDto>>(`/notifications/${encodeURIComponent(notificationId)}/read`, undefined)),
      onSuccess,
    }),
    markAllRead: useMutation({
      mutationFn: async () => unwrapApiResponse(await httpClient.post<ApiEnvelope<{ marked: number }>>('/notifications/read-all', undefined)),
      onSuccess,
    }),
  }
}
