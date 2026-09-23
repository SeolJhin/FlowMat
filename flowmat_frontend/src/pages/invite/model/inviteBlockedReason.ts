import type { ProjectInvitePreviewDto } from '../../../shared/types/api'

/**
 * Why the current user cannot accept this invite, or null when they can.
 * Mirrors the checks ProjectInviteServiceImpl.acceptInvite enforces server-side.
 */
export function inviteBlockedReason(preview: ProjectInvitePreviewDto | undefined): string | null {
  if (!preview) return null
  if (preview.inviteStatus !== 'pending') return `This invitation is already ${preview.inviteStatus}.`
  if (preview.expired) return 'This invitation has expired. Ask the project owner to send a new one.'
  if (!preview.addressedToCurrentUser) {
    return `This invitation was sent to ${preview.invitedEmailMasked ?? 'another address'}. Sign in with that account to accept it.`
  }
  return null
}
