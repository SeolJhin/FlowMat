import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse, unwrapApiVoidResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

export type InspectionStage = 'receipt' | 'production' | 'any'

/** A check an item gets, with its limits (docs/domain/inspection-standard.md). */
export interface InspectionStandardDto {
  standardId: string
  projectId: string
  itemId: string
  itemCode: string | null
  itemName: string | null
  inspectionType: string
  stage: InspectionStage
  standardMin: number | null
  standardMax: number | null
  unit: string | null
  /** Every production run of the item should record this check. */
  required: boolean
  active: boolean
  note: string | null
}

/** Adding sends the item; changing replaces everything else, so an empty limit clears it. */
export interface InspectionStandardInput {
  itemId?: string
  inspectionType: string
  stage: InspectionStage
  standardMin: number | null
  standardMax: number | null
  unit: string | null
  required: boolean
  active?: boolean
  note: string | null
}

export interface RunChecklistLine {
  standardId: string
  itemId: string
  itemCode: string | null
  itemName: string | null
  inspectionType: string
  stage: InspectionStage
  standardMin: number | null
  standardMax: number | null
  unit: string | null
  required: boolean
  /** The latest inspection of the run that followed the standard or recorded the same check on the same item. */
  status: 'missing' | 'pass' | 'fail'
  inspectionId: string | null
  measuredValue: number | null
  inspectedAt: string | null
}

/** The checks of the items a run makes, and how each went in the run. */
export interface RunQualityChecklistDto {
  productionRunId: string
  required: number
  requiredPassed: number
  requiredMissing: number
  failed: number
  lines: RunChecklistLine[]
}

export const inspectionStandardsKey = (projectId: string) => ['inspection-standards', projectId] as const

export function useInspectionStandardsQuery(projectId: string) {
  return useQuery<InspectionStandardDto[]>({
    queryKey: inspectionStandardsKey(projectId),
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<InspectionStandardDto[]>>(`/inspection-standards?projectId=${encodeURIComponent(projectId)}`),
      ),
    enabled: Boolean(projectId),
  })
}

/** Under the inspections key, so recording an inspection refreshes it too. */
export function useRunQualityChecklistQuery(projectId: string, productionRunId: string) {
  return useQuery<RunQualityChecklistDto>({
    queryKey: ['quality-inspections', projectId, 'checklist', productionRunId],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<RunQualityChecklistDto>>(
          `/production-runs/${encodeURIComponent(productionRunId)}/quality-checklist`,
        ),
      ),
    enabled: Boolean(projectId && productionRunId),
  })
}

function replacement(standard: InspectionStandardDto, active: boolean): InspectionStandardInput {
  return {
    inspectionType: standard.inspectionType,
    stage: standard.stage,
    standardMin: standard.standardMin,
    standardMax: standard.standardMax,
    unit: standard.unit,
    required: standard.required,
    active,
    note: standard.note,
  }
}

/** Adding or changing, switching on and off, and deleting standards; each refreshes the list and run checklists. */
export function useInspectionStandardMutations(projectId: string) {
  const queryClient = useQueryClient()
  const onSuccess = async () => {
    // A first load still in flight may have read the list before this change; TanStack would fold the refetch into it.
    await queryClient.cancelQueries({ queryKey: inspectionStandardsKey(projectId) })
    void queryClient.invalidateQueries({ queryKey: inspectionStandardsKey(projectId) })
    void queryClient.invalidateQueries({ queryKey: ['quality-inspections', projectId, 'checklist'] })
  }
  const save = useMutation({
    mutationFn: async ({ standardId, input }: { standardId: string | null; input: InspectionStandardInput }) =>
      unwrapApiResponse(
        standardId
          ? await httpClient.put<ApiEnvelope<InspectionStandardDto>>(`/inspection-standards/${encodeURIComponent(standardId)}`, input)
          : await httpClient.post<ApiEnvelope<InspectionStandardDto>>('/inspection-standards', { projectId, ...input }),
      ),
    onSuccess,
  })
  const toggle = useMutation({
    mutationFn: async (standard: InspectionStandardDto) =>
      unwrapApiResponse(
        await httpClient.put<ApiEnvelope<InspectionStandardDto>>(
          `/inspection-standards/${encodeURIComponent(standard.standardId)}`,
          replacement(standard, !standard.active),
        ),
      ),
    onSuccess,
  })
  const remove = useMutation({
    mutationFn: async (standardId: string) =>
      unwrapApiVoidResponse(await httpClient.delete<ApiEnvelope<null>>(`/inspection-standards/${encodeURIComponent(standardId)}`)),
    onSuccess,
  })
  return { save, toggle, remove }
}
