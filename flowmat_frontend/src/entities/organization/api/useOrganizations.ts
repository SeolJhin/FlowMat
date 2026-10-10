import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { unwrapApiResponse } from '../../../shared/api/unwrapApiResponse'
import type { ApiEnvelope } from '../../../shared/types/api'

/** An organization and the current user's role in it (docs/domain/organization.md OR2). */
export interface OrganizationDto {
  organizationId: string
  organizationName: string
  /** personal or team */
  organizationType: string
  ownerUserId: string
  /** owner, admin or member */
  myRole: string
}

/** An active member (OR2). */
export interface OrganizationMemberDto {
  organizationMemberId: string
  userId: string
  orgRole: string
  memberStatus: string
  joinedAt: string | null
  leftAt: string | null
}

/** Management metadata only, for owners and admins (OR3): no business data, and it opens no project. */
export interface OrganizationProjectDto {
  projectId: string
  projectName: string
  projectStatus: string
  ownerId: string
}

function list<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

const membersPath = (organizationId: string) => `/organizations/${encodeURIComponent(organizationId)}/members`

/** The organizations the current user is an active member of, by name. */
export function useOrganizationsQuery() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: async () => list<OrganizationDto>(unwrapApiResponse(await httpClient.get<ApiEnvelope<OrganizationDto[]>>('/organizations'))),
  })
}

export function useOrganizationMembersQuery(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: async () => list<OrganizationMemberDto>(
      unwrapApiResponse(await httpClient.get<ApiEnvelope<OrganizationMemberDto[]>>(membersPath(organizationId!))),
    ),
    enabled: Boolean(organizationId),
    retry: false,
  })
}

/** Owners and admins only; members are refused, so it is not asked for them (OR3). */
export function useOrganizationProjectsQuery(organizationId: string | undefined, manager: boolean) {
  return useQuery({
    queryKey: ['organization-projects', organizationId],
    queryFn: async () => list<OrganizationProjectDto>(unwrapApiResponse(
      await httpClient.get<ApiEnvelope<OrganizationProjectDto[]>>(`/organizations/${encodeURIComponent(organizationId!)}/projects`),
    )),
    enabled: Boolean(organizationId) && manager,
    retry: false,
  })
}

export function useCreateOrganizationMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (organizationName: string) =>
      unwrapApiResponse(await httpClient.post<ApiEnvelope<OrganizationDto>>('/organizations', { organizationName })),
    // A lost reply may still have made it, so the list is reloaded either way.
    onSettled: () => client.invalidateQueries({ queryKey: ['organizations'] }),
  })
}

/** Add, role change, leave and remove (OR2, OR4). Each reloads the members and my organizations, success or not. */
export function useOrganizationMemberMutations(organizationId: string) {
  const client = useQueryClient()
  const refresh = () => Promise.all([
    client.invalidateQueries({ queryKey: ['organization-members', organizationId] }),
    client.invalidateQueries({ queryKey: ['organizations'] }),
  ])
  const memberPath = (organizationMemberId: string) => `${membersPath(organizationId)}/${encodeURIComponent(organizationMemberId)}`
  const add = useMutation({
    mutationFn: async (input: { userId: string; orgRole: string }) =>
      unwrapApiResponse(await httpClient.post<ApiEnvelope<OrganizationMemberDto>>(membersPath(organizationId), input)),
    onSettled: refresh,
  })
  const changeRole = useMutation({
    mutationFn: async (input: { organizationMemberId: string; orgRole: string }) =>
      unwrapApiResponse(await httpClient.put<ApiEnvelope<OrganizationMemberDto>>(memberPath(input.organizationMemberId), { orgRole: input.orgRole })),
    onSettled: refresh,
  })
  // Leaving also ends the user's memberships of this organization's projects (OR4).
  const leave = useMutation({
    mutationFn: async (organizationMemberId: string) =>
      unwrapApiResponse(await httpClient.post<ApiEnvelope<OrganizationMemberDto>>(`${memberPath(organizationMemberId)}/leave`, null)),
    onSettled: () => Promise.all([refresh(), client.invalidateQueries({ queryKey: ['projects'] })]),
  })
  const remove = useMutation({
    mutationFn: async (organizationMemberId: string) =>
      unwrapApiResponse(await httpClient.post<ApiEnvelope<OrganizationMemberDto>>(`${memberPath(organizationMemberId)}/remove`, null)),
    onSettled: refresh,
  })
  return { add, changeRole, leave, remove }
}
