import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, DefectSeverity } from '../../../shared/types/api'

export type NcrStatus = 'open' | 'closed' | 'cancelled'
export type NcrDisposition = 'pending' | 'use_as_is' | 'rework' | 'scrap' | 'return_to_supplier'
export type NcrActionType = 'correction' | 'corrective' | 'preventive'

export interface NcrDefect {
  defectLogId: string
  defectType: string
  severity: DefectSeverity
  quantity: number
  itemCode: string | null
  lotNo: string | null
  resolved: boolean
}

export interface NcrAction {
  correctiveActionId: string
  actionNo: number
  actionType: NcrActionType
  description: string
  ownerId: string | null
  /** yyyy-MM-dd */
  dueDate: string | null
  status: 'open' | 'done' | 'cancelled'
  resultNote: string | null
  createdBy: string
  createdAt: string
  finishedBy: string | null
  finishedAt: string | null
  /** Open and past its due date. */
  overdue: boolean
}

/** A nonconformity report with its defects and actions (docs/domain/nonconformity.md). */
export interface NonconformityDto {
  nonconformityId: string
  projectId: string
  ncrNo: string
  title: string
  description: string | null
  severity: DefectSeverity
  status: NcrStatus
  itemId: string | null
  itemCode: string | null
  lotId: string | null
  lotNo: string | null
  productionRunId: string | null
  runNumber: string | null
  rootCause: string | null
  disposition: NcrDisposition
  raisedBy: string
  raisedAt: string
  closedBy: string | null
  closedAt: string | null
  closureNote: string | null
  defects: NcrDefect[]
  actions: NcrAction[]
  openActions: number
  overdueActions: number
}

export interface NcrCreateInput {
  title: string
  description: string | null
  /** Empty: the most severe of the defects. */
  severity: DefectSeverity | null
  defectLogIds: string[]
}

export interface NcrUpdateInput {
  title?: string
  description?: string
  severity?: DefectSeverity
  rootCause?: string
  disposition?: NcrDisposition
}

export interface NcrActionInput {
  actionType: NcrActionType
  description: string
  ownerId: string | null
  dueDate: string | null
}

export const nonconformitiesKey = (projectId: string) => ['nonconformities', projectId] as const

/** Newest first; one status only when given. */
export function useNonconformitiesQuery(projectId: string, status: NcrStatus | null) {
  return useQuery<NonconformityDto[]>({
    queryKey: [...nonconformitiesKey(projectId), status],
    queryFn: async () => {
      const params = new URLSearchParams({ projectId })
      if (status) params.set('status', status)
      return unwrapApiResponse(await httpClient.get<ApiEnvelope<NonconformityDto[]>>(`/nonconformities?${params.toString()}`))
    },
    enabled: Boolean(projectId),
  })
}

/** Every change answers with the whole nonconformity and refreshes the lists. */
export function useNonconformityMutations(projectId: string) {
  const queryClient = useQueryClient()
  const onSuccess = async () => {
    // A first load still in flight may have read the list before this change; TanStack would fold the refetch into it.
    await queryClient.cancelQueries({ queryKey: nonconformitiesKey(projectId) })
    void queryClient.invalidateQueries({ queryKey: nonconformitiesKey(projectId) })
  }
  const path = (id: string) => `/nonconformities/${encodeURIComponent(id)}`
  const post = async (url: string, body: unknown) =>
    unwrapApiResponse(await httpClient.post<ApiEnvelope<NonconformityDto>>(url, body))
  const create = useMutation({
    mutationFn: (input: NcrCreateInput) => post('/nonconformities', { projectId, ...input }),
    onSuccess,
  })
  const update = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: NcrUpdateInput }) =>
      unwrapApiResponse(await httpClient.put<ApiEnvelope<NonconformityDto>>(path(id), input)),
    onSuccess,
  })
  const addAction = useMutation({
    mutationFn: ({ id, input }: { id: string; input: NcrActionInput }) => post(`${path(id)}/actions`, input),
    onSuccess,
  })
  const finishAction = useMutation({
    mutationFn: ({ id, actionId, done, note }: { id: string; actionId: string; done: boolean; note: string }) =>
      post(`${path(id)}/actions/${encodeURIComponent(actionId)}/${done ? 'complete' : 'cancel'}`, { note }),
    onSuccess,
  })
  const close = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => post(`${path(id)}/close`, { note }),
    onSuccess,
  })
  const cancel = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => post(`${path(id)}/cancel`, { note }),
    onSuccess,
  })
  return { create, update, addAction, finishAction, close, cancel }
}
