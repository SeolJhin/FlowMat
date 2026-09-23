import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse, unwrapApiVoidResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, UnitDto } from '../../../shared/types/api'

/** Requires the master_data:manage permission on the backend. */
export interface CreateUnitInput {
  unitCode: string
  unitName: string
  unitType: string
  baseUnitCode?: string
  conversionRate?: number
}

export interface UpdateUnitInput {
  unitId: string
  unitName?: string
  conversionRate?: number
  activeYn?: 'Y' | 'N'
}

async function createUnit(input: CreateUnitInput): Promise<UnitDto> {
  return unwrapApiResponse(await httpClient.post<ApiEnvelope<UnitDto>>('/units', input))
}

async function updateUnit({ unitId, ...payload }: UpdateUnitInput): Promise<UnitDto> {
  return unwrapApiResponse(await httpClient.put<ApiEnvelope<UnitDto>>(`/units/${encodeURIComponent(unitId)}`, payload))
}

async function deactivateUnit(unitId: string): Promise<void> {
  unwrapApiVoidResponse(await httpClient.delete<ApiEnvelope<null>>(`/units/${encodeURIComponent(unitId)}`))
}

function useInvalidateUnits() {
  const queryClient = useQueryClient()
  return () => void queryClient.invalidateQueries({ queryKey: ['units'] })
}

export function useCreateUnitMutation() {
  const onSuccess = useInvalidateUnits()
  return useMutation({ mutationFn: createUnit, onSuccess })
}

export function useUpdateUnitMutation() {
  const onSuccess = useInvalidateUnits()
  return useMutation({ mutationFn: updateUnit, onSuccess })
}

export function useDeactivateUnitMutation() {
  const onSuccess = useInvalidateUnits()
  return useMutation({ mutationFn: deactivateUnit, onSuccess })
}
