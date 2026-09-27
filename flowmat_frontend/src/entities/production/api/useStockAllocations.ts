import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

/** A quantity of one stock record reserved for a work order (docs/domain/stock-allocation.md). */
export interface StockAllocationDto {
  allocationId: string
  inventoryId: string
  itemId: string
  itemCode: string | null
  lotId: string | null
  lotNo: string | null
  location: string | null
  quantity: number
  consumedQuantity: number
  releasedQuantity: number
  /** Still reserved. */
  remaining: number
  status: 'open' | 'closed'
  createdBy: string
  createdAt: string
}

export interface AllocationPlanLineDto {
  itemId: string
  itemCode: string
  needed: number
  allocatedBefore: number
  allocatedNow: number
  shortage: number
}

export interface StockAllocationsDto {
  workOrderId: string
  workOrderNumber: string
  workOrderStatus: string
  allocations: StockAllocationDto[]
  /** Only after an allocate call. */
  plan: AllocationPlanLineDto[]
}

const key = (workOrderId: string) => ['work-order-allocations', workOrderId]
const base = (workOrderId: string) => `/work-orders/${encodeURIComponent(workOrderId)}/allocations`

export function useStockAllocationsQuery(workOrderId: string) {
  return useQuery<StockAllocationsDto>({
    queryKey: key(workOrderId),
    queryFn: async () => unwrapApiResponse(await httpClient.get<ApiEnvelope<StockAllocationsDto>>(base(workOrderId))),
    enabled: Boolean(workOrderId),
  })
}

/** Allocating and releasing move reservations, so stock, needs and the order's readiness are fetched again. */
export function useStockAllocationMutations(projectId: string, workOrderId: string) {
  const queryClient = useQueryClient()
  const onSuccess = (result: StockAllocationsDto) => {
    queryClient.setQueryData(key(workOrderId), result)
    void queryClient.invalidateQueries({ queryKey: ['inventories', projectId] })
    void queryClient.invalidateQueries({ queryKey: ['work-order-readiness', workOrderId] })
  }
  const post = async (path: string, body: unknown = {}) => unwrapApiResponse(await httpClient.post<ApiEnvelope<StockAllocationsDto>>(path, body))
  return {
    allocate: useMutation({ mutationFn: () => post(base(workOrderId)), onSuccess }),
    release: useMutation({
      mutationFn: (allocationId: string) => post(`${base(workOrderId)}/${encodeURIComponent(allocationId)}/release`),
      onSuccess,
    }),
    releaseAll: useMutation({ mutationFn: () => post(`${base(workOrderId)}/release`), onSuccess }),
  }
}
