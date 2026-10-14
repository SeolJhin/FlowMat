import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

export type NotificationTopic = 'stock_alert' | 'ncr_check_overdue' | 'work_order_due'

/** Whether the current person hears about a topic in a project (docs/domain/notification.md NS2). */
export interface NotificationSubscriptionDto {
  projectId: string
  topic: NotificationTopic
  subscribed: boolean
  /** work_order_due only: days before the planned end. */
  daysAhead: number | null
}

export interface NotificationSubscriptionInput {
  projectId: string
  topic: NotificationTopic
  subscribed: boolean
  daysAhead?: number
}

const key = (projectId: string) => ['notification-subscriptions', projectId]

export function useNotificationSubscriptionsQuery(projectId: string) {
  return useQuery<NotificationSubscriptionDto[]>({
    queryKey: key(projectId),
    enabled: Boolean(projectId),
    retry: false,
    queryFn: async () => unwrapApiResponse(await httpClient.get<ApiEnvelope<NotificationSubscriptionDto[]>>(
      `/notification-subscriptions?projectId=${encodeURIComponent(projectId)}`)),
  })
}

/** Turns a topic on or off; the answer is the person's whole list for the project. */
export function useSetNotificationSubscriptionMutation(projectId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: NotificationSubscriptionInput) =>
      unwrapApiResponse(await httpClient.put<ApiEnvelope<NotificationSubscriptionDto[]>>('/notification-subscriptions', input)),
    onSettled: () => client.invalidateQueries({ queryKey: key(projectId) }),
  })
}
