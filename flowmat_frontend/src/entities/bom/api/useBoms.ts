import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type {
  ApiEnvelope,
  BomDto,
  BomLineImportResultDto,
  BomLineImportRowDto,
  BomRequirementDto,
  BomWhereUsedDto,
  BuildableQuantityDto,
} from '../../../shared/types/api'

/** Mirrors BomCreateRequest. */
export interface BomCreateInput {
  targetItemId: string
  bomName: string
  baseQuantity: number
  baseUnit: string
  note?: string
}

/** Mirrors BomLineCreateRequest. */
export interface BomLineInput {
  childItemId: string
  quantity: number
  unit: string
}

/** submit needs write access; approve / reject / retire need project owner access. */
export type BomAction = 'submit' | 'approve' | 'reject' | 'retire' | 'revisions'

const path = (bomId: string) => `/boms/${encodeURIComponent(bomId)}`

/** BOM revisions that use the item as a line, approved first (GET /boms/where-used). */
export function useBomWhereUsedQuery(projectId: string, itemId: string | null) {
  return useQuery<BomWhereUsedDto[]>({
    queryKey: ['boms', projectId, 'where-used', itemId],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<BomWhereUsedDto[]>>(
          `/boms/where-used?projectId=${encodeURIComponent(projectId)}&itemId=${encodeURIComponent(itemId ?? '')}`,
        ),
      ),
    enabled: Boolean(projectId && itemId),
  })
}

export function useBomsQuery(projectId: string) {
  return useQuery<BomDto[]>({
    queryKey: ['boms', projectId],
    queryFn: async () =>
      unwrapApiResponse(await httpClient.get<ApiEnvelope<BomDto[]>>(`/boms?projectId=${encodeURIComponent(projectId)}`)),
    enabled: Boolean(projectId),
  })
}

export function useBomRequirementsQuery(bomId: string | null, quantity: number) {
  return useQuery<BomRequirementDto>({
    queryKey: ['bom-requirements', bomId, quantity],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<BomRequirementDto>>(`${path(bomId ?? '')}/requirements?quantity=${quantity}`),
      ),
    enabled: Boolean(bomId) && quantity > 0,
  })
}

/**
 * How much of the BOM's product usable stock could make now. Under ['inventories', projectId] so stock movements refresh
 * it, and fetched fresh when shown.
 */
export function useBomBuildableQuery(projectId: string, bomId: string | null) {
  return useQuery<BuildableQuantityDto>({
    queryKey: ['inventories', projectId, 'bom-buildable', bomId],
    queryFn: async () => unwrapApiResponse(await httpClient.get<ApiEnvelope<BuildableQuantityDto>>(`${path(bomId ?? '')}/buildable`)),
    enabled: Boolean(projectId && bomId),
    staleTime: 0,
  })
}

/** The same for every approved BOM of the project, against one read of the stock. */
export function useBuildableBomsQuery(projectId: string) {
  return useQuery<BuildableQuantityDto[]>({
    queryKey: ['inventories', projectId, 'bom-buildable'],
    queryFn: async () =>
      unwrapApiResponse(
        await httpClient.get<ApiEnvelope<BuildableQuantityDto[]>>(`/boms/buildable?projectId=${encodeURIComponent(projectId)}`),
      ),
    enabled: Boolean(projectId),
    staleTime: 0,
  })
}

function useInvalidateBoms(projectId: string) {
  const queryClient = useQueryClient()
  return () => void queryClient.invalidateQueries({ queryKey: ['boms', projectId] })
}

export function useCreateBomMutation(projectId: string) {
  const onSuccess = useInvalidateBoms(projectId)
  return useMutation({
    mutationFn: async (input: BomCreateInput) =>
      unwrapApiResponse(await httpClient.post<ApiEnvelope<BomDto>>('/boms', { projectId, ...input })),
    onSuccess,
  })
}

export function useBomLineMutations(projectId: string) {
  const onSuccess = useInvalidateBoms(projectId)
  const add = useMutation({
    mutationFn: async ({ bomId, ...line }: BomLineInput & { bomId: string }) =>
      unwrapApiResponse(await httpClient.post<ApiEnvelope<BomDto>>(`${path(bomId)}/lines`, line)),
    onSuccess,
  })
  const remove = useMutation({
    mutationFn: async ({ bomId, bomLineId }: { bomId: string; bomLineId: string }) =>
      unwrapApiResponse(
        await httpClient.delete<ApiEnvelope<BomDto>>(`${path(bomId)}/lines/${encodeURIComponent(bomLineId)}`),
      ),
    onSuccess,
  })
  return { add, remove }
}

export function useBomActionMutation(projectId: string) {
  const onSuccess = useInvalidateBoms(projectId)
  return useMutation({
    mutationFn: async ({ bomId, action, note }: { bomId: string; action: BomAction; note?: string }) =>
      unwrapApiResponse(await httpClient.post<ApiEnvelope<BomDto>>(`${path(bomId)}/${action}`, note ? { note } : {})),
    onSuccess,
  })
}

/** Checks (dry run) or saves a draft's materials from a spreadsheet (docs/domain/item-import.md "BOM 자재"). */
export function useImportBomLinesMutation(projectId: string) {
  const onSuccess = useInvalidateBoms(projectId)
  return useMutation({
    mutationFn: async ({ bomId, ...body }: { bomId: string; rows: BomLineImportRowDto[]; dryRun: boolean; replace: boolean }) =>
      unwrapApiResponse(await httpClient.post<ApiEnvelope<BomLineImportResultDto>>(`${path(bomId)}/lines/import`, body)),
    onSuccess,
  })
}

/** Another product's first draft BOM from this one's base and materials (POST /boms/{id}/copy). */
export function useCopyBomMutation(projectId: string) {
  const onSuccess = useInvalidateBoms(projectId)
  return useMutation({
    mutationFn: async ({ bomId, targetItemId, bomName }: { bomId: string; targetItemId: string; bomName?: string }) =>
      unwrapApiResponse(await httpClient.post<ApiEnvelope<BomDto>>(`${path(bomId)}/copy`, { targetItemId, bomName })),
    onSuccess,
  })
}
