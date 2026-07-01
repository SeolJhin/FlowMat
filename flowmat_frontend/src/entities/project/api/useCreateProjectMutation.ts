import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProjectSummaryDto } from '../../../shared/types/api'

export interface CreateProjectInput {
  projectName: string
  ownerId: string
  projectDesc?: string
  visibility?: string
}

async function createProject(input: CreateProjectInput): Promise<ProjectSummaryDto> {
  const envelope = await httpClient.post<ApiEnvelope<ProjectSummaryDto>>('/projects', input)
  return unwrapApiResponse(envelope)
}

export function useCreateProjectMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
