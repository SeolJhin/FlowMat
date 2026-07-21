import { Navigate, createBrowserRouter } from 'react-router-dom'
import { HomeRoute } from '../../pages/home/ui/HomeRoute'
import { WorkspaceRoute } from '../../pages/workspace/ui/WorkspaceRoute'
import { InventoryRoute } from '../../pages/inventory/ui/InventoryRoute'
import { RunsRoute } from '../../pages/runs/ui/RunsRoute'
import { RunDetailRoute } from '../../pages/runs/ui/RunDetailRoute'
import { TemplatesRoute } from '../../pages/templates/ui/TemplatesRoute'
import { RulesRoute } from '../../pages/rules/ui/RulesRoute'

export const router = createBrowserRouter([
  { path: '/',                                           element: <HomeRoute /> },
  { path: '/projects/:projectId/workflows/:workflowId', element: <WorkspaceRoute /> },
  { path: '/projects/:projectId/inventory',             element: <InventoryRoute /> },
  { path: '/projects/:projectId/runs',                  element: <RunsRoute /> },
  { path: '/projects/:projectId/runs/:runId',           element: <RunDetailRoute /> },
  { path: '/projects/:projectId/templates',             element: <TemplatesRoute /> },
  { path: '/projects/:projectId/rules',                 element: <RulesRoute /> },
  { path: '*',                                          element: <Navigate to="/" replace /> },
])
