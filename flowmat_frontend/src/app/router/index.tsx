import { Navigate, createBrowserRouter } from 'react-router-dom'
import { HomeRoute } from '../../pages/home/ui/HomeRoute'
import { WorkspaceRoute } from '../../pages/workspace/ui/WorkspaceRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomeRoute />,
  },
  {
    path: '/projects/:projectId/workflows/:workflowId',
    element: <WorkspaceRoute />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
