import { useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope, ProjectDto } from '../../../shared/types/api'

export interface CreateProjectInput {
  projectName: string
  ownerId: string
  projectDesc?: string
  visibility?: string
  /** A team organization the creator belongs to; empty means their personal one (docs/domain/organization.md OR6). */
  organizationId?: string
}

async function createProject(input: CreateProjectInput): Promise<ProjectDto> {
  const envelope = await httpClient.post<ApiEnvelope<ProjectDto>>('/projects', input)
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
