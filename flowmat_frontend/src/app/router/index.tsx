import { createBrowserRouter } from 'react-router-dom'
import { WorkspaceRoute } from '../../pages/workspace/ui/WorkspaceRoute'

export const router = createBrowserRouter([
  {
    path: '/projects/:projectId/workflows/:workflowId',
    element: <WorkspaceRoute />,
  },
  {
    path: '*',
    element: (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h2>FlowMat</h2>
        <p>Navigate to /projects/:projectId/workflows/:workflowId to open a canvas.</p>
      </div>
    ),
  },
])
