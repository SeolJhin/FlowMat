import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'
export type SetupRuleType = 'NONE' | 'EXACT_ITEM_PAIR' | 'ATTRIBUTE_RULE' | 'FROM_ITEM' | 'TO_ITEM' | 'DEFAULT'
export interface EquipmentSetupPreviewDto {
  equipmentId: string; fromItemId: string; toItemId: string; minutes: number; ruleType: SetupRuleType; changeoverId: string | null
}
const types: readonly string[] = ['NONE', 'EXACT_ITEM_PAIR', 'ATTRIBUTE_RULE', 'FROM_ITEM', 'TO_ITEM', 'DEFAULT']
export function useEquipmentSetupPreview(equipmentId: string, fromItemId: string, toItemId: string) {
  return useQuery({
    queryKey: ['equipment-setup-preview', equipmentId, fromItemId, toItemId],
    enabled: Boolean(equipmentId && fromItemId && toItemId), retry: false, staleTime: 0,
    queryFn: async () => {
      const result = unwrapApiResponse(await httpClient.get<ApiEnvelope<EquipmentSetupPreviewDto>>(
        `/equipments/${encodeURIComponent(equipmentId)}/setup-preview?fromItemId=${encodeURIComponent(fromItemId)}&toItemId=${encodeURIComponent(toItemId)}`))
      if (!result || result.equipmentId !== equipmentId || result.fromItemId !== fromItemId || result.toItemId !== toItemId
        || !types.includes(result.ruleType) || !Number.isInteger(result.minutes) || result.minutes < 0 || result.minutes > 10080
        || (result.ruleType === 'NONE' ? result.minutes !== 0 || result.changeoverId !== null
          : result.minutes === 0 || typeof result.changeoverId !== 'string' || !result.changeoverId || result.changeoverId.length > 50))
        throw new Error('Invalid setup preview response. Reload the saved preview.')
      return result
    },
  })
}
