import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ItemImportResultDto, ItemImportRowDto } from '../../../shared/types/api'

/** Checks (dry run) or saves items from a spreadsheet (docs/domain/item-import.md); the item list refreshes when saved. */
export function useImportItemsMutation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ rows, dryRun }: { rows: ItemImportRowDto[]; dryRun: boolean }) =>
      unwrapApiResponse(
        await httpClient.post<ApiEnvelope<ItemImportResultDto>>('/items/import', { projectId, dryRun, rows }),
      ),
    onSuccess: (result) => {
      if (result.applied) {
        void queryClient.invalidateQueries({ queryKey: ['items', projectId] })
      }
    },
  })
}
