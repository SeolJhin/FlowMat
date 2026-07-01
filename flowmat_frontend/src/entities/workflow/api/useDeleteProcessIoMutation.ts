import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'

async function deleteProcessIo(processIoId: string): Promise<void> {
  await httpClient.delete(`/process-ios/${processIoId}`)
}

export function useDeleteProcessIoMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProcessIo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workflow-canvas'] })
    },
  })
}
