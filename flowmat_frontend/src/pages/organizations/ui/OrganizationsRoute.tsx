import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCurrentUserQuery } from '../../../entities/auth/api/useCurrentUserQuery'
import {
  type OrganizationDto,
  type OrganizationMemberDto,
  useCreateOrganizationMutation,
  useOrganizationMemberMutations,
  useOrganizationMembersQuery,
  useOrganizationProjectsQuery,
  useOrganizationsQuery,
} from '../../../entities/organization/api/useOrganizations'
import { errorMessage } from '../../../shared/lib/errorMessage'
import {
  MAX_ORGANIZATION_NAME,
  ORG_ROLES,
  addableRoles,
  canChangeRoles,
  isManager,
  leaveBlock,
  organizationNameError,
  removeBlock,
  roleChangeBlock,
} from '../model/organizationModel'

/*
 * Organizations I belong to and their members (docs/domain/organization.md OR2-OR4). Membership here opens no project:
 * project access stays with each project's owner and members.
 */
const sectionStyle: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 16, padding: 24, display: 'grid', gap: 16 }
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 14 }
const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 12, opacity: 0.7,
  textTransform: 'uppercase', letterSpacing: '0.04em',
}
const tdStyle: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }
const alertStyle: React.CSSProperties = { margin: 0, color: 'var(--danger, #dc2626)', fontSize: 13 }

function Badge({ text }: { text: string }) {
  const colors: Record<string, string> = { owner: '#8b5cf6', admin: '#0ea5e9', member: '#64748b', personal: '#16a34a', team: '#d97706' }
  const color = colors[text] ?? '#64748b'
  return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600,
    background: `${color}22`, color }}>{text}</span>
}

function CreateOrganizationForm({ onCreated }: { onCreated: (organization: OrganizationDto) => void }) {
  const create = useCreateOrganizationMutation()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const problem = organizationNameError(name)
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    try {
      const created = await create.mutateAsync(name.trim())
      setName('')
      onCreated(created)
    } catch (failure) {
      // Creating is not repeat-safe: a lost reply may still have made it, and the list has been reloaded.
      setError(`${errorMessage(failure)} Check the list before trying again.`)
    }
  }

  return (
    <form aria-label="New team organization" onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
      <strong style={{ fontSize: 13 }}>New team organization</strong>
      <input aria-label="Organization name" value={name} maxLength={MAX_ORGANIZATION_NAME}
        onChange={(event) => setName(event.target.value)} placeholder="Plant team" />
      <button type="submit" disabled={create.isPending}>{create.isPending ? 'Creating...' : 'Create organization'}</button>
      {error && <p role="alert" style={alertStyle}>{error}</p>}
    </form>
  )
}

function AddMemberForm({ organizationId, myRole }: { organizationId: string; myRole: string }) {
  const { add } = useOrganizationMemberMutations(organizationId)
  const roles = addableRoles(myRole)
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<string>('member')
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setAdded(null)
    if (!userId.trim()) {
      setError('Give the user ID to add.')
      return
    }
    try {
      const member = await add.mutateAsync({ userId: userId.trim(), orgRole: role })
      setUserId('')
      setAdded(`Added ${member.userId} as ${member.orgRole}.`)
    } catch (failure) {
      setError(errorMessage(failure))
    }
  }

  return (
    <form aria-label="Add organization member" onSubmit={submit} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <input aria-label="User ID" value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="Sign-in ID" />
      <select aria-label="New member role" value={role} onChange={(event) => setRole(event.target.value)}>
        {roles.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <button type="submit" disabled={add.isPending}>Add member</button>
      <span className="inspector-hint" style={{ flexBasis: '100%', fontSize: 12 }}>Adding someone opens none of the organization&apos;s projects.</span>
      {error && <p role="alert" style={alertStyle}>{error}</p>}
      {added && <p role="status" style={{ margin: 0, fontSize: 13 }}>{added}</p>}
    </form>
  )
}

function MembersTable({ organization, me }: { organization: OrganizationDto; me: string | undefined }) {
  const navigate = useNavigate()
  const membersQuery = useOrganizationMembersQuery(organization.organizationId)
  const members = membersQuery.data ?? []
  const { changeRole, leave, remove } = useOrganizationMemberMutations(organization.organizationId)
  const [roleDraft, setRoleDraft] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const owner = canChangeRoles(organization.myRole)
  const busy = changeRole.isPending || leave.isPending || remove.isPending

  async function act(action: () => Promise<unknown>, done: string, after?: () => void) {
    setError(null)
    setNotice(null)
    try {
      await action()
      setNotice(done)
      after?.()
    } catch (failure) {
      setError(errorMessage(failure))
    }
  }

  function saveRole(member: OrganizationMemberDto) {
    const role = roleDraft[member.organizationMemberId] ?? member.orgRole
    void act(() => changeRole.mutateAsync({ organizationMemberId: member.organizationMemberId, orgRole: role }),
      `${member.userId} is now ${role}.`, () => setRoleDraft((draft) => {
        const next = { ...draft }
        delete next[member.organizationMemberId]
        return next
      }))
  }

  function leaveOrganization(member: OrganizationMemberDto) {
    if (!window.confirm(`Leave ${organization.organizationName}? Your memberships of its projects end too.`)) return
    void act(() => leave.mutateAsync(member.organizationMemberId), `You left ${organization.organizationName}.`,
      () => navigate('/organizations'))
  }

  function removeMember(member: OrganizationMemberDto) {
    if (!window.confirm(`Remove ${member.userId}? Their memberships of this organization's projects end too.`)) return
    void act(() => remove.mutateAsync(member.organizationMemberId), `Removed ${member.userId}.`)
  }

  if (membersQuery.isLoading) return <p>Loading members...</p>
  if (membersQuery.isError) return <p role="alert">{errorMessage(membersQuery.error, 'Members could not be loaded.')}</p>

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <table style={tableStyle} aria-label="Organization members">
        <thead>
          <tr><th style={thStyle}>User</th><th style={thStyle}>Role</th><th style={thStyle}>Joined</th><th style={thStyle} /></tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const self = member.userId === me
            const draft = roleDraft[member.organizationMemberId] ?? member.orgRole
            const roleProblem = roleChangeBlock(member, draft, members)
            const leaveProblem = self ? leaveBlock(member, members) : null
            const removeProblem = self ? null : removeBlock(organization.myRole, member, members)
            return (
              <tr key={member.organizationMemberId}>
                <td style={tdStyle}>{member.userId}{self && <span className="inspector-hint"> (you)</span>}</td>
                <td style={tdStyle}>
                  {owner ? (
                    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                      <select aria-label={`Role of ${member.userId}`} value={draft}
                        onChange={(event) => setRoleDraft((current) => ({ ...current, [member.organizationMemberId]: event.target.value }))}>
                        {ORG_ROLES.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                      {draft !== member.orgRole && (
                        <button type="button" disabled={busy || roleProblem !== null} title={roleProblem ?? undefined}
                          onClick={() => saveRole(member)}>Save role</button>
                      )}
                    </span>
                  ) : <Badge text={member.orgRole} />}
                  {draft !== member.orgRole && roleProblem && <div className="inspector-hint" style={{ fontSize: 12 }}>{roleProblem}</div>}
                </td>
                <td style={tdStyle}>{member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : ''}</td>
                <td style={tdStyle}>
                  {self ? (
                    <button type="button" disabled={busy || leaveProblem !== null} title={leaveProblem ?? undefined}
                      onClick={() => leaveOrganization(member)}>Leave</button>
                  ) : isManager(organization.myRole) && removeProblem === null ? (
                    <button type="button" disabled={busy} onClick={() => removeMember(member)}>Remove</button>
                  ) : null}
                  {self && leaveProblem && <div className="inspector-hint" style={{ fontSize: 12 }}>{leaveProblem}</div>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {error && <p role="alert" style={alertStyle}>{error}</p>}
      {notice && <p role="status" style={{ margin: 0, fontSize: 13 }}>{notice}</p>}
    </div>
  )
}

function OrganizationProjects({ organization }: { organization: OrganizationDto }) {
  const projectsQuery = useOrganizationProjectsQuery(organization.organizationId, true)
  const projects = projectsQuery.data ?? []
  return (
    <section aria-label="Organization projects" style={{ display: 'grid', gap: 8 }}>
      <h3 style={{ margin: 0 }}>Projects</h3>
      <p className="inspector-hint" style={{ margin: 0, fontSize: 12 }}>
        Names, status and owners only. Seeing a project here does not open it; ask its owner to add you.
      </p>
      {projectsQuery.isError && <p role="alert">{errorMessage(projectsQuery.error, 'Projects could not be loaded.')}</p>}
      {projectsQuery.isSuccess && projects.length === 0 && <p style={{ margin: 0 }}>No projects yet.</p>}
      {projects.length > 0 && (
        <table style={tableStyle}>
          <thead><tr><th style={thStyle}>Project</th><th style={thStyle}>Status</th><th style={thStyle}>Owner</th></tr></thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.projectId}>
                <td style={tdStyle}>{project.projectName}</td>
                <td style={tdStyle}>{project.projectStatus}</td>
                <td style={tdStyle}>{project.ownerId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function OrganizationDetail({ organization, me }: { organization: OrganizationDto; me: string | undefined }) {
  const manager = isManager(organization.myRole)
  return (
    <section aria-label={`Organization ${organization.organizationName}`} style={sectionStyle}>
      <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <h2 style={{ margin: 0 }}>{organization.organizationName}</h2>
        <Badge text={organization.organizationType} />
        <span style={{ fontSize: 13, opacity: 0.7 }}>Your role: {organization.myRole}</span>
      </header>
      {organization.organizationType === 'personal' && (
        <p className="inspector-hint" style={{ margin: 0, fontSize: 13 }}>
          Your personal workspace. New projects go here unless another organization is chosen.
        </p>
      )}
      <section aria-label="Members" style={{ display: 'grid', gap: 8 }}>
        <h3 style={{ margin: 0 }}>Members</h3>
        <MembersTable organization={organization} me={me} />
        {manager && <AddMemberForm organizationId={organization.organizationId} myRole={organization.myRole} />}
      </section>
      {manager ? <OrganizationProjects organization={organization} /> : (
        <p className="inspector-hint" style={{ margin: 0, fontSize: 13 }}>Only owners and admins see the organization&apos;s project list.</p>
      )}
    </section>
  )
}

export function OrganizationsRoute() {
  const { organizationId } = useParams<{ organizationId?: string }>()
  const navigate = useNavigate()
  const organizationsQuery = useOrganizationsQuery()
  const me = useCurrentUserQuery().data?.userId
  const organizations = organizationsQuery.data ?? []
  const selected = organizationId
    ? organizations.find((organization) => organization.organizationId === organizationId)
    : organizations[0]

  return (
    <div style={{ minHeight: '100svh', padding: 32, maxWidth: 1080, margin: '0 auto', display: 'grid', gap: 24,
      alignContent: 'start', boxSizing: 'border-box' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>← Home</Link>
        <h1 style={{ margin: 0 }}>Organizations</h1>
      </header>
      <p className="inspector-hint" style={{ margin: 0, fontSize: 13 }}>
        An organization groups projects and people. Being a member opens none of its projects; each project keeps its own members.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'start' }}>
        <div style={{ ...sectionStyle, flex: '1 1 240px', maxWidth: 320 }}>
          <nav aria-label="Your organizations">
            {organizationsQuery.isLoading && <p>Loading...</p>}
            {organizationsQuery.isError && <p role="alert">{errorMessage(organizationsQuery.error, 'Organizations could not be loaded.')}</p>}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
              {organizations.map((organization) => {
                const current = organization.organizationId === selected?.organizationId
                return (
                  <li key={organization.organizationId}>
                    <Link to={`/organizations/${encodeURIComponent(organization.organizationId)}`} aria-current={current ? 'page' : undefined}
                      style={{ display: 'flex', gap: 8, alignItems: 'center', textDecoration: 'none', color: 'inherit',
                        fontWeight: current ? 700 : 400 }}>
                      <span>{organization.organizationName}</span>
                      <Badge text={organization.organizationType} />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
          <CreateOrganizationForm onCreated={(created) => navigate(`/organizations/${encodeURIComponent(created.organizationId)}`)} />
        </div>
        <div style={{ flex: '3 1 480px', minWidth: 0 }}>
          {selected ? <OrganizationDetail key={selected.organizationId} organization={selected} me={me} />
            : organizationsQuery.isSuccess && organizationId ? (
              <p role="status">This organization is not in your list; you may have left it or never joined.</p>
            ) : organizationsQuery.isSuccess ? <p>You are not in any organization yet.</p> : null}
        </div>
      </div>
    </div>
  )
}
