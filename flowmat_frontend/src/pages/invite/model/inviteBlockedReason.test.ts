import { describe, expect, it } from 'vitest'
import type { ProjectInvitePreviewDto } from '../../../shared/types/api'
import { inviteBlockedReason } from './inviteBlockedReason'

const acceptable: ProjectInvitePreviewDto = {
  projectName: 'Line A',
  projectRole: 'editor',
  inviterName: 'Owner Kim',
  invitedEmailMasked: 'gu***@flowmat.local',
  inviteStatus: 'pending',
  expiredAt: null,
  expired: false,
  addressedToCurrentUser: true,
}

describe('inviteBlockedReason', () => {
  it('allows a pending, unexpired invite addressed to the current user', () => {
    expect(inviteBlockedReason(acceptable)).toBeNull()
  })

  it('does not block while the preview is still loading', () => {
    expect(inviteBlockedReason(undefined)).toBeNull()
  })

  it('blocks invites that were already handled', () => {
    expect(inviteBlockedReason({ ...acceptable, inviteStatus: 'accepted' })).toBe('This invitation is already accepted.')
  })

  it('blocks expired invites before checking the addressee', () => {
    expect(inviteBlockedReason({ ...acceptable, expired: true, addressedToCurrentUser: false })).toMatch(/expired/)
  })

  it('names the masked addressee when signed in with another account', () => {
    expect(inviteBlockedReason({ ...acceptable, addressedToCurrentUser: false })).toContain('gu***@flowmat.local')
  })
})
