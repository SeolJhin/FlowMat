import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCreateProjectMutation } from '../../../entities/project/api/useCreateProjectMutation'
import { useProjectsQuery } from '../../../entities/project/api/useProjectsQuery'
import { useCreateWorkflowMutation } from '../../../entities/workflow/api/useCreateWorkflowMutation'
import { useWorkflowsQuery } from '../../../entities/workflow/api/useWorkflowsQuery'
import {
  useLoginMutation,
  useLogoutMutation,
  useRequestDormantMutation,
  useRequestDormantReactivationMutation,
  useSendEmailCodeMutation,
  useSignupMutation,
  useVerifyEmailCodeMutation,
} from '../../../entities/auth/api/useLoginMutation'
import { useCurrentUserQuery } from '../../../entities/auth/api/useCurrentUserQuery'
import { useMyPermissionsQuery } from '../../../entities/auth/api/useMyPermissionsQuery'
import { subscribeAuthChange, tokenStorage } from '../../../entities/auth/lib/authSession'
import {
  preloadInventoryRoute,
  preloadRulesRoute,
  preloadRunsRoute,
  preloadTemplatesRoute,
} from '../../../app/router/routePreload'
import { preloadWorkspaceExperience } from '../../workspace/ui/workspacePreload'

function Dashboard({ onLogout, onRequestDormant }: { onLogout: () => void; onRequestDormant: () => void }) {
  const navigate = useNavigate()
  const currentUserQuery = useCurrentUserQuery()
  const currentUser = currentUserQuery.data
  const permissionsQuery = useMyPermissionsQuery(!!currentUser)

  const {
    data: projects = [],
    isLoading: isProjectsLoading,
    isError: isProjectsError,
    error: projectsError,
  } = useProjectsQuery()

  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectDesc, setProjectDesc] = useState('')
  const [workflowName, setWorkflowName] = useState('')
  const [workflowDesc, setWorkflowDesc] = useState('')

  const createProjectMutation = useCreateProjectMutation()
  const createWorkflowMutation = useCreateWorkflowMutation()

  const projectLinks = useMemo(
    () =>
      selectedProjectId
        ? [
            { label: 'Inventory', to: `/projects/${selectedProjectId}/inventory`, preload: preloadInventoryRoute },
            { label: 'Runs', to: `/projects/${selectedProjectId}/runs`, preload: preloadRunsRoute },
            { label: 'Templates', to: `/projects/${selectedProjectId}/templates`, preload: preloadTemplatesRoute },
            { label: 'Rules', to: `/projects/${selectedProjectId}/rules`, preload: preloadRulesRoute },
            { label: 'Settings', to: `/projects/${selectedProjectId}/settings`, preload: async () => {} },
          ]
        : [],
    [selectedProjectId]
  )

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].projectId)
    }
  }, [projects, selectedProjectId])

  const {
    data: workflows = [],
    isLoading: isWorkflowsLoading,
    isError: isWorkflowsError,
    error: workflowsError,
  } = useWorkflowsQuery(selectedProjectId)

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const created = await createProjectMutation.mutateAsync({
      projectName,
      ownerId: currentUser?.userId ?? '',
      projectDesc,
      visibility: 'private',
    })
    setProjectName('')
    setProjectDesc('')
    setSelectedProjectId(created.projectId)
  }

  async function handleCreateWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedProjectId) return
    const preload = preloadWorkspaceExperience()
    const created = await createWorkflowMutation.mutateAsync({
      projectId: selectedProjectId,
      workflowName,
      workflowDesc,
      workflowType: 'main',
    })
    setWorkflowName('')
    setWorkflowDesc('')
    await preload
    navigate(`/projects/${created.projectId}/workflows/${created.workflowId}`)
  }

  return (
    <div style={{ minHeight: '100svh', padding: '32px', display: 'grid', gap: '24px', textAlign: 'left', boxSizing: 'border-box' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ marginBottom: '12px' }}>FlowMat Workspace</h1>
          <p>
            {currentUser
              ? `${currentUser.userName} (${currentUser.userId}), choose a project or create a new one.`
              : 'Select a project, then open one of its workflows.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" onClick={onRequestDormant} style={{ fontSize: 12, padding: '4px 10px', height: 30 }}>
            Dormant
          </button>
          {permissionsQuery.data?.canManageUsers && (
            <Link
              to="/admin"
              style={{ fontSize: 12, padding: '4px 10px', height: 30, display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 6, textDecoration: 'none', color: 'var(--text-h)' }}
            >
              Admin
            </Link>
          )}
          <button type="button" onClick={onLogout} style={{ fontSize: 12, padding: '4px 10px', height: 30 }}>
            Logout
          </button>
        </div>
      </header>

      {projectLinks.length > 0 && (
        <section style={{ display: 'grid', gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.7 }}>
            Selected Project Tools
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {projectLinks.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onMouseEnter={() => void item.preload()}
                onFocus={() => void item.preload()}
                style={{ padding: '10px 14px', borderRadius: '999px', border: '1px solid var(--border)', color: 'var(--text-h)', textDecoration: 'none', background: 'var(--surface)' }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <form
          onSubmit={(e) => void handleCreateProject(e)}
          style={{ border: '1px solid var(--border)', borderRadius: '16px', padding: '18px', display: 'grid', gap: '10px' }}
        >
          <h2>Create Project</h2>
          <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Project name" required />
          <input value={currentUser?.userId ?? ''} readOnly placeholder="Owner (logged-in account)" style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          <textarea value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} placeholder="Project description" rows={3} />
          <button type="submit" disabled={createProjectMutation.isPending}>
            {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
          </button>
          {createProjectMutation.isError && (
            <p>{createProjectMutation.error instanceof Error ? createProjectMutation.error.message : 'Failed to create project.'}</p>
          )}
        </form>

        <form
          onSubmit={(e) => void handleCreateWorkflow(e)}
          style={{ border: '1px solid var(--border)', borderRadius: '16px', padding: '18px', display: 'grid', gap: '10px' }}
        >
          <h2>Create Workflow</h2>
          <input value={selectedProjectId} readOnly placeholder="Select a project first" />
          <input value={workflowName} onChange={(e) => setWorkflowName(e.target.value)} placeholder="Workflow name" required />
          <textarea value={workflowDesc} onChange={(e) => setWorkflowDesc(e.target.value)} placeholder="Workflow description" rows={3} />
          <button type="submit" disabled={!selectedProjectId || createWorkflowMutation.isPending}>
            {createWorkflowMutation.isPending ? 'Creating...' : 'Create Workflow'}
          </button>
          {createWorkflowMutation.isError && (
            <p>{createWorkflowMutation.error instanceof Error ? createWorkflowMutation.error.message : 'Failed to create workflow.'}</p>
          )}
        </form>
      </section>

      <section>
        <h2>Projects</h2>
        {isProjectsLoading && <p>Loading projects...</p>}
        {isProjectsError && <p>{projectsError instanceof Error ? projectsError.message : 'Failed to load projects.'}</p>}
        {!isProjectsLoading && !isProjectsError && projects.length === 0 && <p>No projects found.</p>}
        <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
          {projects.map((project) => {
            const isSelected = project.projectId === selectedProjectId
            return (
              <button
                key={project.projectId}
                type="button"
                onClick={() => setSelectedProjectId(project.projectId)}
                style={{
                  padding: '16px 18px',
                  borderRadius: '14px',
                  border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: isSelected ? 'var(--accent-bg)' : 'transparent',
                  color: 'var(--text-h)',
                  boxShadow: isSelected ? 'var(--shadow)' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: '18px', fontWeight: 600 }}>{project.projectName}</div>
                <div style={{ fontSize: '14px', opacity: 0.8 }}>{project.projectStatus} | {project.projectId}</div>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h2>Workflows</h2>
        {!selectedProjectId && <p>Select a project first.</p>}
        {selectedProjectId && isWorkflowsLoading && <p>Loading workflows...</p>}
        {selectedProjectId && isWorkflowsError && <p>{workflowsError instanceof Error ? workflowsError.message : 'Failed to load workflows.'}</p>}
        {selectedProjectId && !isWorkflowsLoading && !isWorkflowsError && workflows.length === 0 && <p>No workflows found for the selected project.</p>}
        <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
          {workflows.map((workflow) => (
            <Link
              key={workflow.workflowId}
              to={`/projects/${workflow.projectId}/workflows/${workflow.workflowId}`}
              onMouseEnter={() => void preloadWorkspaceExperience()}
              onFocus={() => void preloadWorkspaceExperience()}
              style={{ display: 'block', padding: '16px 18px', borderRadius: '14px', border: '1px solid var(--border)', color: 'var(--text-h)', textDecoration: 'none' }}
            >
              <div style={{ fontSize: '18px', fontWeight: 600 }}>{workflow.workflowName}</div>
              <div style={{ fontSize: '14px', opacity: 0.8 }}>{workflow.workflowStatus} | {workflow.workflowType}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

export function HomeRoute() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!tokenStorage.getAccess())
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authUserId, setAuthUserId] = useState('')
  const [authUserName, setAuthUserName] = useState('')
  const [authNickname, setAuthNickname] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authEmailCode, setAuthEmailCode] = useState('')
  const [authTel, setAuthTel] = useState('')
  const [authBirth, setAuthBirth] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authInfo, setAuthInfo] = useState<string | null>(null)
  const [showDormantHelp, setShowDormantHelp] = useState(false)

  const loginMutation = useLoginMutation()
  const signupMutation = useSignupMutation()
  const logoutMutation = useLogoutMutation()
  const requestDormantMutation = useRequestDormantMutation()
  const requestDormantReactivationMutation = useRequestDormantReactivationMutation()
  const sendEmailCodeMutation = useSendEmailCodeMutation()
  const verifyEmailCodeMutation = useVerifyEmailCodeMutation()

  useEffect(() => subscribeAuthChange(() => setIsLoggedIn(!!tokenStorage.getAccess())), [])

  useEffect(() => {
    if (authMode !== 'signup') return
    setIsEmailVerified(false)
    setAuthEmailCode('')
  }, [authEmail, authMode])

  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault()
    setAuthError(null)
    setAuthInfo(null)
    setShowDormantHelp(false)
    try {
      if (authMode === 'login') {
        await loginMutation.mutateAsync({ userIdOrEmail: authUserId, password: authPassword })
      } else {
        if (!isEmailVerified) {
          throw new Error('Verify your email before creating an account.')
        }

        await signupMutation.mutateAsync({
          userId: authUserId,
          userName: authUserName,
          userNickname: authNickname,
          userEmail: authEmail,
          userTel: authTel,
          userBirth: authBirth,
          password: authPassword,
        })
        await loginMutation.mutateAsync({ userIdOrEmail: authUserId, password: authPassword })
      }

      setAuthUserId('')
      setAuthUserName('')
      setAuthNickname('')
      setAuthEmail('')
      setAuthEmailCode('')
      setAuthTel('')
      setAuthBirth('')
      setAuthPassword('')
      setIsEmailVerified(false)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Authentication failed.'
      setAuthError(message)
      setShowDormantHelp(message.toLowerCase().includes('dormant'))
    }
  }

  function handleLogout() {
    void logoutMutation.mutateAsync()
  }

  async function handleSendEmailCode() {
    setAuthError(null)
    setAuthInfo(null)
    try {
      await sendEmailCodeMutation.mutateAsync(authEmail.trim())
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Failed to send email code.')
    }
  }

  async function handleVerifyEmailCode() {
    setAuthError(null)
    setAuthInfo(null)
    try {
      await verifyEmailCodeMutation.mutateAsync({
        userEmail: authEmail.trim(),
        code: authEmailCode.trim(),
      })
      setIsEmailVerified(true)
    } catch (err) {
      setIsEmailVerified(false)
      setAuthError(err instanceof Error ? err.message : 'Failed to verify email code.')
    }
  }

  async function handleDormantReactivationRequest() {
    setAuthError(null)
    setAuthInfo(null)
    try {
      await requestDormantReactivationMutation.mutateAsync(authUserId.trim())
      setAuthInfo('If the account is dormant, a reactivation email has been sent.')
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Failed to request dormant account reactivation.')
    }
  }

  async function handleRequestDormant() {
    setAuthError(null)
    setAuthInfo(null)
    const confirmed = window.confirm('Put this account into dormant status and sign out now?')
    if (!confirmed) return

    try {
      await requestDormantMutation.mutateAsync()
      tokenStorage.clear()
      setIsLoggedIn(false)
      setAuthMode('login')
      setAuthPassword('')
      setAuthInfo('Your account is now dormant. Use the reactivation email to sign in again.')
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Failed to request dormant status.')
    }
  }

  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form
          onSubmit={(e) => void handleAuthSubmit(e)}
          style={{ width: 360, padding: 24, border: '1px solid var(--border)', borderRadius: 16, display: 'grid', gap: 12, background: 'var(--bg)' }}
        >
          <h2 style={{ margin: 0 }}>FlowMat {authMode === 'login' ? 'Login' : 'Sign Up'}</h2>
          {authMode === 'signup' && (
            <>
              <input value={authUserName} onChange={(e) => setAuthUserName(e.target.value)} placeholder="Name" required />
              <input value={authNickname} onChange={(e) => setAuthNickname(e.target.value)} placeholder="Nickname" required />
              <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} placeholder="Email" required />
              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>
                  {isEmailVerified ? 'Email verified' : 'Email verification required'}
                </span>
                <button
                  type="button"
                  onClick={() => void handleSendEmailCode()}
                  disabled={!authEmail.trim() || sendEmailCodeMutation.isPending}
                >
                  {sendEmailCodeMutation.isPending ? 'Sending...' : 'Send Code'}
                </button>
              </div>
              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr auto' }}>
                <input
                  value={authEmailCode}
                  onChange={(e) => setAuthEmailCode(e.target.value)}
                  placeholder="Email verification code"
                  required
                />
                <button
                  type="button"
                  onClick={() => void handleVerifyEmailCode()}
                  disabled={!authEmail.trim() || !authEmailCode.trim() || verifyEmailCodeMutation.isPending}
                >
                  {verifyEmailCodeMutation.isPending ? 'Verifying...' : 'Verify'}
                </button>
              </div>
              <input value={authTel} onChange={(e) => setAuthTel(e.target.value)} placeholder="Phone number" required />
              <input type="date" value={authBirth} onChange={(e) => setAuthBirth(e.target.value)} required />
            </>
          )}
          <input
            value={authUserId}
            onChange={(e) => setAuthUserId(e.target.value)}
            placeholder={authMode === 'login' ? 'User ID or email' : 'User ID'}
            required
          />
          <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="Password" required />
          {authError && <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{authError}</p>}
          {authInfo && <p style={{ color: 'var(--accent)', fontSize: 13, margin: 0 }}>{authInfo}</p>}
          {authMode === 'login' && showDormantHelp && (
            <button
              type="button"
              onClick={() => void handleDormantReactivationRequest()}
              disabled={!authUserId.trim() || requestDormantReactivationMutation.isPending}
            >
              {requestDormantReactivationMutation.isPending ? 'Sending Reactivation Email...' : 'Send Reactivation Email'}
            </button>
          )}
          <button
            type="submit"
            disabled={
              loginMutation.isPending
              || signupMutation.isPending
              || requestDormantReactivationMutation.isPending
              || sendEmailCodeMutation.isPending
              || verifyEmailCodeMutation.isPending
            }
          >
            {loginMutation.isPending || signupMutation.isPending ? 'Working...' : authMode === 'login' ? 'Login' : 'Create Account'}
          </button>
          <button
            type="button"
            style={{ background: 'transparent', border: 'none', fontSize: 13, color: 'var(--accent)', cursor: 'pointer' }}
            onClick={() => {
              setAuthMode((mode) => (mode === 'login' ? 'signup' : 'login'))
              setAuthError(null)
              setAuthInfo(null)
              setShowDormantHelp(false)
              setIsEmailVerified(false)
              setAuthEmailCode('')
            }}
          >
            {authMode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Login'}
          </button>
          <p style={{ fontSize: 11, color: 'var(--text)', opacity: 0.5, margin: 0, textAlign: 'center' }}>
            Demo account: demo-owner / demo1234
          </p>
        </form>
      </div>
    )
  }

  return <Dashboard onLogout={handleLogout} onRequestDormant={() => void handleRequestDormant()} />
}
