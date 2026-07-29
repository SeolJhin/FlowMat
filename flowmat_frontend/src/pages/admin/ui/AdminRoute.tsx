import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useRolesQuery } from '../../../entities/admin/api/useRolesQuery'
import { useAdminUsersQuery } from '../../../entities/admin/api/useAdminUsersQuery'
import { useUserRolesQuery } from '../../../entities/admin/api/useUserRolesQuery'
import { useGrantRoleMutation } from '../../../entities/admin/api/useGrantRoleMutation'
import { useRevokeRoleMutation } from '../../../entities/admin/api/useRevokeRoleMutation'
import type { RoleDto, UserDto, UserRoleDto } from '../../../shared/types/api'

const card: React.CSSProperties = {
  border: '1px solid var(--border)', borderRadius: 16, padding: 24,
  display: 'grid', gap: 16,
}
const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 14 }
const th: React.CSSProperties = {
  textAlign: 'left', padding: '6px 10px',
  borderBottom: '1px solid var(--border)',
  fontWeight: 600, fontSize: 12, opacity: 0.7,
  textTransform: 'uppercase', letterSpacing: '0.04em',
}
const td: React.CSSProperties = {
  padding: '8px 10px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle',
}

function Badge({ name, color }: { name: string; color: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: `${color}22`, color }}>
      {name}
    </span>
  )
}

const roleColor = (name: string) => name === 'admin' ? '#8b5cf6' : '#64748b'

function RolesPanel({ roles }: { roles: RoleDto[] }) {
  return (
    <div style={card}>
      <h2 style={{ margin: 0 }}>System Roles</h2>
      <table style={tbl}>
        <thead><tr><th style={th}>Name</th><th style={th}>Description</th></tr></thead>
        <tbody>
          {roles.map((r) => (
            <tr key={r.roleId}>
              <td style={td}><Badge name={r.roleName} color={roleColor(r.roleName)} /></td>
              <td style={td}>{r.roleDescription ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function UserRoleDrawer({ user, roles }: { user: UserDto; roles: RoleDto[] }) {
  const { data: userRoles = [], isLoading, isError, error } = useUserRolesQuery(user.userId)
  const grantMutation = useGrantRoleMutation(user.userId)
  const revokeMutation = useRevokeRoleMutation(user.userId)
  const [actionError, setActionError] = useState<string | null>(null)

  const grantedNames = new Set(userRoles.map((ur) => ur.roleName))
  const grantable = roles.filter((r) => !grantedNames.has(r.roleName))

  async function handleGrant(roleName: string) {
    setActionError(null)
    try { await grantMutation.mutateAsync(roleName) }
    catch (err) { setActionError(err instanceof Error ? err.message : 'Failed to grant role.') }
  }

  async function handleRevoke(ur: UserRoleDto) {
    if (!confirm(`Revoke "${ur.roleName}" from ${user.userId}?`)) return
    setActionError(null)
    try { await revokeMutation.mutateAsync(ur.userRolesId) }
    catch (err) { setActionError(err instanceof Error ? err.message : 'Failed to revoke role.') }
  }

  return (
    <div style={{ padding: '12px 0', display: 'grid', gap: 10 }}>
      {actionError && <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{actionError}</p>}
      {isLoading && <span style={{ opacity: 0.5, fontSize: 13 }}>Loading…</span>}
      {isError && <span style={{ color: '#dc2626', fontSize: 13 }}>{error instanceof Error ? error.message : 'Error'}</span>}

      {!isLoading && !isError && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {userRoles.length === 0 && <span style={{ fontSize: 13, opacity: 0.5 }}>No roles</span>}
          {userRoles.map((ur) => (
            <span key={ur.userRolesId} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Badge name={ur.roleName} color={roleColor(ur.roleName)} />
              <button
                type="button"
                onClick={() => void handleRevoke(ur)}
                disabled={revokeMutation.isPending}
                style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, cursor: 'pointer', color: '#dc2626', borderColor: '#dc2626', background: 'transparent' }}
              >
                ✕
              </button>
            </span>
          ))}
          {grantable.map((r) => (
            <button
              key={r.roleId}
              type="button"
              onClick={() => void handleGrant(r.roleName)}
              disabled={grantMutation.isPending}
              style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, cursor: 'pointer', opacity: 0.7 }}
            >
              + {r.roleName}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function UsersPanel({ roles }: { roles: RoleDto[] }) {
  const [search, setSearch] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: users = [], isLoading, isError, error } = useAdminUsersQuery(submitted)

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    setSubmitted(search.trim())
    setExpandedId(null)
  }

  return (
    <div style={card}>
      <h2 style={{ margin: 0 }}>User Role Management</h2>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by user ID, name, or email"
          style={{ flex: 1 }}
        />
        <button type="submit" style={{ padding: '6px 16px', borderRadius: 8, cursor: 'pointer' }}>
          Search
        </button>
      </form>

      {isLoading && <p style={{ opacity: 0.5 }}>Searching…</p>}
      {isError && <p style={{ color: '#dc2626', fontSize: 13 }}>{error instanceof Error ? error.message : 'Search failed.'}</p>}
      {!isLoading && !isError && submitted && users.length === 0 && (
        <p style={{ opacity: 0.5 }}>No users found.</p>
      )}

      {users.length > 0 && (
        <table style={tbl}>
          <thead>
            <tr>
              <th style={th}>User ID</th>
              <th style={th}>Name</th>
              <th style={th}>Email</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <>
                <tr
                  key={u.userId}
                  onClick={() => setExpandedId(expandedId === u.userId ? null : u.userId)}
                  style={{ cursor: 'pointer', background: expandedId === u.userId ? 'var(--accent-bg, #f5f3ff)' : undefined }}
                >
                  <td style={td}><code style={{ fontSize: 13 }}>{u.userId}</code></td>
                  <td style={td}>{u.userName}</td>
                  <td style={td}>{u.userEmail}</td>
                  <td style={td}>{u.userStatus}</td>
                </tr>
                {expandedId === u.userId && (
                  <tr key={`${u.userId}-roles`}>
                    <td colSpan={4} style={{ ...td, background: 'var(--surface)', paddingLeft: 24 }}>
                      <UserRoleDrawer user={u} roles={roles} />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export function AdminRoute() {
  const { data: roles = [], isLoading: rolesLoading, isError: rolesError, error: rolesErr } = useRolesQuery()

  return (
    <div style={{ minHeight: '100svh', padding: 32, maxWidth: 900, margin: '0 auto', display: 'grid', gap: 24, boxSizing: 'border-box' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>← Home</Link>
        <h1 style={{ margin: 0 }}>Admin — Role Management</h1>
      </header>

      {rolesLoading && <p style={{ opacity: 0.5 }}>Loading…</p>}
      {rolesError && (
        <p style={{ color: '#dc2626' }}>
          {rolesErr instanceof Error ? rolesErr.message : 'Failed to load. Check permissions.'}
        </p>
      )}

      {!rolesLoading && !rolesError && (
        <>
          <RolesPanel roles={roles} />
          <UsersPanel roles={roles} />
        </>
      )}
    </div>
  )
}
