import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

/** How long the equipment takes to switch from one item to another; null items mean any item (docs/domain/equipment-changeover.md). */
export interface EquipmentChangeoverDto {
  changeoverId: string
  equipmentId: string
  fromItemId: string | null
  fromItemCode: string | null
  fromItemName: string | null
  toItemId: string | null
  toItemCode: string | null
  toItemName: string | null
  minutes: number
  note: string | null
}

export interface EquipmentChangeoverInput {
  fromItemId: string | null
  toItemId: string | null
  minutes: number
  note: string | null
}

const changeoversKey = (equipmentId: string) => ['equipment-changeovers', equipmentId]

/** Exact pairs first, then rules with an open side, then any to any. */
export function useEquipmentChangeoversQuery(equipmentId: string) {
  return useQuery<EquipmentChangeoverDto[]>({
    queryKey: changeoversKey(equipmentId),
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<EquipmentChangeoverDto[]>>(`/equipments/${encodeURIComponent(equipmentId)}/changeovers`),
      ),
    enabled: Boolean(equipmentId),
  })
}

/** Every change returns the whole list; work order readiness is fetched again since it counts changeovers. */
export function useEquipmentChangeoverMutations(equipmentId: string) {
  const queryClient = useQueryClient()
  const base = `/equipments/${encodeURIComponent(equipmentId)}/changeovers`
  const onSuccess = (rules: EquipmentChangeoverDto[]) => {
    queryClient.setQueryData(changeoversKey(equipmentId), rules)
    for (const queryKey of [['work-order-readiness'], ['work-order-plan'], ['equipment-load'], ['equipment-setup-preview']])
      void queryClient.invalidateQueries({ queryKey })
  }
  return {
    add: useMutation({
      mutationFn: async (input: EquipmentChangeoverInput) =>
        unwrapApiResponse(await httpClient.post<ApiEnvelope<EquipmentChangeoverDto[]>>(base, input)),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: async ({ changeoverId, minutes, note }: { changeoverId: string; minutes: number; note: string | null }) =>
        unwrapApiResponse(
          await httpClient.put<ApiEnvelope<EquipmentChangeoverDto[]>>(`${base}/${encodeURIComponent(changeoverId)}`, { minutes, note }),
        ),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: async (changeoverId: string) =>
        unwrapApiResponse(await httpClient.delete<ApiEnvelope<EquipmentChangeoverDto[]>>(`${base}/${encodeURIComponent(changeoverId)}`)),
      onSuccess,
    }),
  }
}
