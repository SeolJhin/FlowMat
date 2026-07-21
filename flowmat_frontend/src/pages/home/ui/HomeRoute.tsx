import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useCreateProjectMutation } from '../../../entities/project/api/useCreateProjectMutation'
import { useProjectsQuery } from '../../../entities/project/api/useProjectsQuery'
import { useCreateWorkflowMutation } from '../../../entities/workflow/api/useCreateWorkflowMutation'
import { useWorkflowsQuery } from '../../../entities/workflow/api/useWorkflowsQuery'

export function HomeRoute() {
  const {
    data: projects = [],
    isLoading: isProjectsLoading,
    isError: isProjectsError,
    error: projectsError,
  } = useProjectsQuery()
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectOwnerId, setProjectOwnerId] = useState('')
  const [projectDesc, setProjectDesc] = useState('')
  const [workflowName, setWorkflowName] = useState('')
  const [workflowDesc, setWorkflowDesc] = useState('')

  const createProjectMutation = useCreateProjectMutation()
  const createWorkflowMutation = useCreateWorkflowMutation()

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
    const createdProject = await createProjectMutation.mutateAsync({
      projectName,
      ownerId: projectOwnerId,
      projectDesc,
      visibility: 'private',
    })

    setProjectName('')
    setProjectDesc('')
    setSelectedProjectId(createdProject.projectId)
  }

  async function handleCreateWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedProjectId) return

    await createWorkflowMutation.mutateAsync({
      projectId: selectedProjectId,
      workflowName,
      workflowDesc,
      workflowType: 'main',
    })

    setWorkflowName('')
    setWorkflowDesc('')
  }

  return (
    <div
      style={{
        minHeight: '100svh',
        padding: '32px',
        display: 'grid',
        gap: '24px',
        textAlign: 'left',
        boxSizing: 'border-box',
      }}
    >
      <header>
        <h1 style={{ marginBottom: '12px' }}>FlowMat Workspace</h1>
        <p>Select a project, then open one of its workflows.</p>
      </header>

      <section
        style={{
          display: 'grid',
          gap: '16px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        }}
      >
        <form
          onSubmit={handleCreateProject}
          style={{
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '18px',
            display: 'grid',
            gap: '10px',
          }}
        >
          <h2>Create Project</h2>
          <input
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            placeholder="Project name"
            required
          />
          <input
            value={projectOwnerId}
            onChange={(event) => setProjectOwnerId(event.target.value)}
            placeholder="Owner ID"
            required
          />
          <textarea
            value={projectDesc}
            onChange={(event) => setProjectDesc(event.target.value)}
            placeholder="Project description"
            rows={3}
          />
          <button type="submit" disabled={createProjectMutation.isPending}>
            {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
          </button>
          {createProjectMutation.isError && (
            <p>{createProjectMutation.error instanceof Error ? createProjectMutation.error.message : 'Failed to create project.'}</p>
          )}
        </form>

        <form
          onSubmit={handleCreateWorkflow}
          style={{
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '18px',
            display: 'grid',
            gap: '10px',
          }}
        >
          <h2>Create Workflow</h2>
          <input value={selectedProjectId} readOnly placeholder="Select a project first" />
          <input
            value={workflowName}
            onChange={(event) => setWorkflowName(event.target.value)}
            placeholder="Workflow name"
            required
          />
          <textarea
            value={workflowDesc}
            onChange={(event) => setWorkflowDesc(event.target.value)}
            placeholder="Workflow description"
            rows={3}
          />
          <button
            type="submit"
            disabled={!selectedProjectId || createWorkflowMutation.isPending}
          >
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
        {isProjectsError && (
          <p>{projectsError instanceof Error ? projectsError.message : 'Failed to load projects.'}</p>
        )}
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
                <div style={{ fontSize: '14px', opacity: 0.8 }}>
                  {project.projectStatus} | {project.projectId}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h2>Workflows</h2>
        {!selectedProjectId && <p>Select a project first.</p>}
        {selectedProjectId && isWorkflowsLoading && <p>Loading workflows...</p>}
        {selectedProjectId && isWorkflowsError && (
          <p>{workflowsError instanceof Error ? workflowsError.message : 'Failed to load workflows.'}</p>
        )}
        {selectedProjectId && !isWorkflowsLoading && !isWorkflowsError && workflows.length === 0 && (
          <p>No workflows found for the selected project.</p>
        )}
        <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
          {workflows.map((workflow) => (
            <Link
              key={workflow.workflowId}
              to={`/projects/${workflow.projectId}/workflows/${workflow.workflowId}`}
              style={{
                display: 'block',
                padding: '16px 18px',
                borderRadius: '14px',
                border: '1px solid var(--border)',
                color: 'var(--text-h)',
                textDecoration: 'none',
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 600 }}>{workflow.workflowName}</div>
              <div style={{ fontSize: '14px', opacity: 0.8 }}>
                {workflow.workflowStatus} | {workflow.workflowType}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
