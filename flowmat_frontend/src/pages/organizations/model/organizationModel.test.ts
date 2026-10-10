import { describe, expect, it } from 'vitest'
import {
  addableRoles,
  canChangeRoles,
  isManager,
  leaveBlock,
  organizationNameError,
  removeBlock,
  roleChangeBlock,
} from './organizationModel'

const owner = { userId: 'ann', orgRole: 'owner' }
const admin = { userId: 'bob', orgRole: 'admin' }
const member = { userId: 'cy', orgRole: 'member' }

describe('organizationModel', () => {
  it('lets owners give any role and admins admin or member', () => {
    expect(addableRoles('owner')).toEqual(['owner', 'admin', 'member'])
    expect(addableRoles('admin')).toEqual(['admin', 'member'])
    expect(addableRoles('member')).toEqual([])
    expect(isManager('admin')).toBe(true)
    expect(isManager('member')).toBe(false)
    expect(canChangeRoles('owner')).toBe(true)
    expect(canChangeRoles('admin')).toBe(false)
  })

  it('keeps one owner', () => {
    expect(roleChangeBlock(owner, 'admin', [owner, admin])).toMatch(/last owner/)
    expect(roleChangeBlock(owner, 'admin', [owner, { ...admin, orgRole: 'owner' }])).toBeNull()
    expect(roleChangeBlock(member, 'admin', [owner, member])).toBeNull()
    expect(leaveBlock(owner, [owner, member])).toMatch(/last owner/)
    expect(leaveBlock(member, [owner, member])).toBeNull()
    expect(removeBlock('owner', owner, [owner])).toMatch(/last owner/)
  })

  it('lets admins remove members only', () => {
    expect(removeBlock('admin', member, [owner, admin, member])).toBeNull()
    expect(removeBlock('admin', admin, [owner, admin, member])).toBe('Admins can remove members only.')
    expect(removeBlock('owner', admin, [owner, admin])).toBeNull()
    expect(removeBlock('member', member, [owner, member])).toMatch(/Only owners and admins/)
  })

  it('needs a name of at most 100 characters', () => {
    expect(organizationNameError('  ')).toBe('Give the organization a name.')
    expect(organizationNameError('x'.repeat(101))).toBe('At most 100 characters.')
    expect(organizationNameError(' Plant team ')).toBeNull()
  })
})
