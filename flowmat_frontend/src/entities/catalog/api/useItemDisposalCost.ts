import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

/** An item's disposal cost per item unit (docs/domain/bom-by-products.md WD2); not its unit cost. */
export interface ItemDisposalCostDto {
  itemId: string
  disposalCost: number | null
  version: number
  updatedBy: string | null
  updatedAt: string | null
}
export interface ItemDisposalCostInput { disposalCost: number | null; expectedVersion: number }
/** One change, newest first (docs/domain/bom-by-products.md WD7); null is unknown, zero is free. */
export interface ItemDisposalCostChangeDto {
  previousDisposalCost: number | null
  disposalCost: number | null
  changedBy: string
  changedAt: string
}
const key = (itemId: string) => ['item-disposal-cost', itemId]
const path = (itemId: string) => `/items/${encodeURIComponent(itemId)}/disposal-cost`

function confirmedCost(envelope: ApiEnvelope<ItemDisposalCostDto>, itemId: string): ItemDisposalCostDto {
  const cost = unwrapApiResponse(envelope)
  if (!cost || typeof cost !== 'object' || Array.isArray(cost) || cost.itemId !== itemId
    || !Number.isSafeInteger(cost.version) || cost.version < 0
    || (cost.disposalCost !== null && (typeof cost.disposalCost !== 'number' || !Number.isFinite(cost.disposalCost) || cost.disposalCost < 0)))
    throw new Error('The disposal cost response is invalid. Reload the current disposal cost.')
  return cost
}

export function useItemDisposalCost(itemId: string) {
  const client = useQueryClient()
  const query = useQuery({
    queryKey: key(itemId),
    queryFn: async () => confirmedCost(await httpClient.get<ApiEnvelope<ItemDisposalCostDto>>(path(itemId)), itemId),
    enabled: Boolean(itemId),
    retry: false,
  })
  const history = useQuery({
    queryKey: [...key(itemId), 'history'],
    queryFn: async () => {
      const changes = unwrapApiResponse(await httpClient.get<ApiEnvelope<ItemDisposalCostChangeDto[]>>(`${path(itemId)}/history`))
      return Array.isArray(changes) ? changes : []
    },
    enabled: Boolean(itemId),
    retry: false,
  })
  const save = useMutation({
    mutationFn: async (input: ItemDisposalCostInput) =>
      confirmedCost(await httpClient.put<ApiEnvelope<ItemDisposalCostDto>>(path(itemId), input), itemId),
    onMutate: () => client.cancelQueries({ queryKey: key(itemId) }),
    onSuccess: (cost) => {
      client.setQueryData(key(itemId), cost)
      void client.invalidateQueries({ queryKey: [...key(itemId), 'history'] })
      // Open runs price their waste at today's cost.
      void client.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'production-run-items' && query.queryKey[2] === 'waste-disposal' })
    },
    retry: false,
  })
  return { query, save, history }
}
