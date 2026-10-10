import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

export interface EquipmentHourlyCostDto {
  equipmentId: string
  hourlyCost: number | null
  version: number
  updatedBy: string | null
  updatedAt: string | null
}
export interface EquipmentHourlyCostInput { hourlyCost: number | null; expectedVersion: number }
/** One rate change, newest first (docs/domain/equipment-setup-cost.md AS9). */
export interface EquipmentHourlyCostChangeDto {
  previousHourlyCost: number | null
  hourlyCost: number | null
  version: number
  changedBy: string
  changedAt: string
}
const key = (equipmentId: string) => ['equipment-hourly-cost', equipmentId]
const path = (equipmentId: string) => `/equipments/${encodeURIComponent(equipmentId)}/hourly-cost`

function confirmedRate(envelope: ApiEnvelope<EquipmentHourlyCostDto>, equipmentId: string): EquipmentHourlyCostDto {
  const rate = unwrapApiResponse(envelope)
  if (!rate || typeof rate !== 'object' || Array.isArray(rate) || rate.equipmentId !== equipmentId
    || !Number.isSafeInteger(rate.version) || rate.version < 0
    || (rate.hourlyCost !== null && (typeof rate.hourlyCost !== 'number' || !Number.isFinite(rate.hourlyCost) || rate.hourlyCost < 0)))
    throw new Error('The hourly equipment cost response is invalid. Reload the current rate.')
  return rate
}

export function useEquipmentHourlyCost(equipmentId: string, projectId: string) {
  const client = useQueryClient()
  const query = useQuery({
    queryKey: key(equipmentId),
    queryFn: async () => confirmedRate(await httpClient.get<ApiEnvelope<EquipmentHourlyCostDto>>(path(equipmentId)), equipmentId),
    enabled: Boolean(equipmentId),
    retry: false,
  })
  const save = useMutation({
    mutationFn: async (input: EquipmentHourlyCostInput) =>
      confirmedRate(await httpClient.put<ApiEnvelope<EquipmentHourlyCostDto>>(path(equipmentId), input), equipmentId),
    onMutate: () => client.cancelQueries({ queryKey: key(equipmentId) }),
    onSuccess: (rate) => {
      client.setQueryData(key(equipmentId), rate)
      void client.invalidateQueries({ queryKey: [...key(equipmentId), 'history'] })
      void client.invalidateQueries({ queryKey: ['equipment-load', projectId] })
    },
    retry: false,
  })
  return { query, save }
}

/** The rate's changes, newest first (docs/domain/equipment-setup-cost.md AS9); saving a rate fetches them again. */
export function useEquipmentHourlyCostHistory(equipmentId: string) {
  return useQuery({
    queryKey: [...key(equipmentId), 'history'],
    queryFn: async () => {
      const changes = unwrapApiResponse(await httpClient.get<ApiEnvelope<EquipmentHourlyCostChangeDto[]>>(`${path(equipmentId)}/history`))
      return Array.isArray(changes) ? changes : []
    },
    enabled: Boolean(equipmentId),
    retry: false,
  })
}
