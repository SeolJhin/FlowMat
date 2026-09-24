import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type {
  ApiEnvelope,
  DefectCreateRequest,
  DefectDto,
  QualityInspectionCreateRequest,
  QualityInspectionDto,
} from '../../../shared/types/api'

/** Narrows quality records to one run and/or one LOT. */
export interface QualityFilter {
  productionRunId?: string | null
  lotId?: string | null
}

function query(projectId: string, filter: QualityFilter, extra: Record<string, string> = {}) {
  const params = new URLSearchParams({ projectId, ...extra })
  if (filter.productionRunId) params.set('productionRunId', filter.productionRunId)
  if (filter.lotId) params.set('lotId', filter.lotId)
  return params.toString()
}

/** Inspections, newest first (docs/domain/quality-inspection.md). */
export function useQualityInspectionsQuery(projectId: string, filter: QualityFilter) {
  return useQuery<QualityInspectionDto[]>({
    queryKey: ['quality-inspections', projectId, filter.productionRunId ?? null, filter.lotId ?? null],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<QualityInspectionDto[]>>(`/quality-inspections?${query(projectId, filter)}`),
      ),
    enabled: Boolean(projectId),
  })
}

/** Defects, newest first; unresolved ones only when {@code openOnly}. */
export function useDefectsQuery(projectId: string, filter: QualityFilter, openOnly = false) {
  return useQuery<DefectDto[]>({
    queryKey: ['defects', projectId, filter.productionRunId ?? null, filter.lotId ?? null, openOnly],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<DefectDto[]>>(`/defects?${query(projectId, filter, { openOnly: String(openOnly) })}`),
      ),
    enabled: Boolean(projectId),
  })
}

/** A failed inspection can quarantine its LOT in the same request, so stock views refresh too when it asked to. */
export function useRecordInspectionMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: Omit<QualityInspectionCreateRequest, 'projectId'>) =>
      unwrapApiResponse(
        await httpClient.post<ApiEnvelope<QualityInspectionDto>>('/quality-inspections', { projectId, ...body }),
      ),
    onSuccess: (_data, body) => {
      void queryClient.invalidateQueries({ queryKey: ['quality-inspections', projectId] })
      if (body.quarantineLot) {
        void queryClient.invalidateQueries({ queryKey: ['inventories', projectId] })
        void queryClient.invalidateQueries({ queryKey: ['lots', projectId] })
        void queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] })
      }
    },
  })
}

export function useLogDefectMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: Omit<DefectCreateRequest, 'projectId'>) =>
      unwrapApiResponse(await httpClient.post<ApiEnvelope<DefectDto>>('/defects', { projectId, ...body })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['defects', projectId] })
    },
  })
}

/** What resolving a defect sends; the scrap fields write defective stock off in the same request. */
export interface DefectResolution {
  actionTaken: string
  scrapInventoryId?: string
  scrapQuantity?: number
}

export function useResolveDefectMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ defectLogId, ...resolution }: DefectResolution & { defectLogId: string }) =>
      unwrapApiResponse(
        await httpClient.post<ApiEnvelope<DefectDto>>(`/defects/${encodeURIComponent(defectLogId)}/resolve`, resolution),
      ),
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: ['defects', projectId] })
      if (input.scrapInventoryId) {
        void queryClient.invalidateQueries({ queryKey: ['inventories', projectId] })
        void queryClient.invalidateQueries({ queryKey: ['lots', projectId] })
        void queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] })
      }
    },
  })
}
