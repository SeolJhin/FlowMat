import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import { newRequestId } from '../../../shared/lib/requestId'
import type { ApiEnvelope, InventoryTransactionDto, LotDto, LotRecallDto, LotRecallQuarantineResultDto, LotTraceDto } from '../../../shared/types/api'

export function useLotsQuery(projectId: string) {
  return useQuery<LotDto[]>({
    queryKey: ['lots', projectId],
    queryFn: async () =>
      unwrapApiResponse(await httpClient.get<ApiEnvelope<LotDto[]>>(`/lots?projectId=${encodeURIComponent(projectId)}`)),
    enabled: Boolean(projectId),
  })
}

export function useLotTraceQuery(lotId: string | null, direction: 'backward' | 'forward') {
  return useQuery<LotTraceDto>({
    queryKey: ['lot-trace', lotId, direction],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<LotTraceDto>>(`/lots/${encodeURIComponent(lotId ?? '')}/trace?direction=${direction}`),
      ),
    enabled: Boolean(lotId),
  })
}

function useInvalidateStock(projectId: string) {
  const queryClient = useQueryClient()
  return async () => {
    // A first load still in flight may have read the list before this change. TanStack folds a refetch into such a
    // load instead of restarting it (it only restarts loads that already have data), so drop it first.
    await queryClient.cancelQueries({ queryKey: ['lots', projectId] })
    await queryClient.cancelQueries({ queryKey: ['inventories', projectId] })
    void queryClient.invalidateQueries({ queryKey: ['lots', projectId] })
    void queryClient.invalidateQueries({ queryKey: ['inventories', projectId] })
  }
}

export function useCreateLotMutation(projectId: string) {
  const onSuccess = useInvalidateStock(projectId)
  return useMutation({
    mutationFn: async (input: { itemId: string; lotNo: string; expiryDate?: string }) =>
      unwrapApiResponse(await httpClient.post<ApiEnvelope<LotDto>>('/lots', { projectId, ...input })),
    onSuccess,
  })
}

export function useCloseLotMutation(projectId: string) {
  const onSuccess = useInvalidateStock(projectId)
  return useMutation({
    mutationFn: async (lotId: string) =>
      unwrapApiResponse(await httpClient.post<ApiEnvelope<LotDto>>(`/lots/${encodeURIComponent(lotId)}/close`, {})),
    onSuccess,
  })
}

/**
 * Quarantine or release stock (a whole LOT when the record has one). Each click sends a fresh requestId, so a
 * double-submitted click is rejected by the server instead of applied twice.
 */
export function useQuarantineMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ inventoryId, release }: { inventoryId: string; release: boolean }) =>
      unwrapApiResponse(
        await httpClient.post<ApiEnvelope<InventoryTransactionDto>>('/inventory-transactions', {
          inventoryId,
          transactionType: release ? 'unquarantine' : 'quarantine',
          requestId: newRequestId(),
        }),
      ),
    onSuccess: (transaction) => {
      void queryClient.invalidateQueries({ queryKey: ['inventories', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['lots', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['inventory-transactions', transaction.inventoryId] })
    },
  })
}

/** A suspect LOT and what it went into (docs/domain/lot-recall.md); under ['lots', projectId] so stock changes refresh it. */
export function useLotRecallQuery(projectId: string, lotId: string, enabled: boolean) {
  return useQuery<LotRecallDto>({
    queryKey: ['lots', projectId, 'recall', lotId],
    queryFn: async () => unwrapApiResponse(await httpClient.get<ApiEnvelope<LotRecallDto>>(`/lots/${encodeURIComponent(lotId)}/recall`)),
    enabled: Boolean(projectId && lotId) && enabled,
  })
}

/** Quarantines the suspect LOT and everything made from it, all together. */
export function useRecallQuarantineMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ lotId, reason }: { lotId: string; reason: string }) =>
      unwrapApiResponse(
        await httpClient.post<ApiEnvelope<LotRecallQuarantineResultDto>>(`/lots/${encodeURIComponent(lotId)}/recall/quarantine`, { reason }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lots', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['inventories', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] })
    },
  })
}
