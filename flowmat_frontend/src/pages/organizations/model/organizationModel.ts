/** The organization screen's rules, the same as the server's (docs/domain/organization.md OR2, OR4). */
export const ORG_ROLES = ['owner', 'admin', 'member'] as const
export type OrgRole = (typeof ORG_ROLES)[number]
export const MAX_ORGANIZATION_NAME = 100

interface Member { userId: string; orgRole: string }

export function isManager(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'admin'
}

/** Roles I may give a new member: owners any, admins admin or member. */
export function addableRoles(myRole: string | null | undefined): OrgRole[] {
  if (myRole === 'owner') return [...ORG_ROLES]
  if (myRole === 'admin') return ['admin', 'member']
  return []
}

export function canChangeRoles(myRole: string | null | undefined): boolean {
  return myRole === 'owner'
}

export function ownerCount(members: readonly Member[]): number {
  return members.filter((member) => member.orgRole === 'owner').length
}

/** Why the role cannot change to {@code role}, or null. */
export function roleChangeBlock(target: Member, role: string, members: readonly Member[]): string | null {
  if (target.orgRole === 'owner' && role !== 'owner' && ownerCount(members) <= 1) {
    return 'The last owner cannot be demoted; make another member owner first.'
  }
  return null
}

/** Why I cannot remove {@code target}, or null. The server also refuses someone who owns a project of the organization. */
export function removeBlock(myRole: string | null | undefined, target: Member, members: readonly Member[]): string | null {
  if (!isManager(myRole)) return 'Only owners and admins remove members.'
  if (myRole !== 'owner' && target.orgRole !== 'member') return 'Admins can remove members only.'
  if (target.orgRole === 'owner' && ownerCount(members) <= 1) return 'The last owner cannot be removed.'
  return null
}

/** Why I cannot leave, or null. The server also refuses someone who owns a project of the organization. */
export function leaveBlock(me: Member, members: readonly Member[]): string | null {
  if (me.orgRole === 'owner' && ownerCount(members) <= 1) return 'The last owner cannot leave; make another member owner first.'
  return null
}

export function organizationNameError(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'Give the organization a name.'
  if (trimmed.length > MAX_ORGANIZATION_NAME) return `At most ${MAX_ORGANIZATION_NAME} characters.`
  return null
}
