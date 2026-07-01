import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProjectsQuery } from '../../../entities/project/api/useProjectsQuery'
import { useWorkflowsQuery } from '../../../entities/workflow/api/useWorkflowsQuery'

export function HomeRoute() {
  const {
    data: projects = [],
    isLoading: isProjectsLoading,
    isError: isProjectsError,
    error: projectsError,
  } = useProjectsQuery()
  const [selectedProjectId, setSelectedProjectId] = useState('')

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
